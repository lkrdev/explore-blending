import { ExtensionSDK } from '@looker/extension-sdk';
import { IUpdateArtifact, Looker40SDK } from '@looker/sdk';
import {
    API_URL,
    ARTIFACT_NAMESPACE,
    CLIENT_ID_USER_ATTRIBUTE,
    CLIENT_SECRET_USER_ATTRIBUTE,
    PERSONAL_ACCESS_TOKEN_USER_ATTRIBUTE,
    WEBHOOK_SECRET_USER_ATTRIBUTE,
} from '../constants';
import { getArtifactKey } from './artifacts';
import getExploreLabelFromQuery from './explore_label';
import getQuerySql, { fieldTransform } from './getSQL';
import { getConnectionDialect, getConnectionModel } from './index';

var stringify = require('fast-stable-stringify');

const EXPLORE_POLL_RETRIES = 30;
const EXPLORE_POLL_DELAY = 2000;

export const STATUS_MESSAGES = {
    get_explore_connection: 'connection information',
    get_query_sql: 'SQL queries from explores',
    get_model_information: 'model information',
    get_model_explore: 'model explore',
    get_connection_meta: 'connection meta',
    get_new_explore_data: 'new explore data',
};

interface HandleLookMLBlendParams {
    sdk: Looker40SDK;
    extension: ExtensionSDK;
    queries: IQuery[];
    joins: { [key: string]: IQueryJoin };
    first_query_connection: string | undefined;
    config: any;
    search_params: URLSearchParams;
    getExploreField: (
        explore_id: string,
        field_id: string,
    ) => IExploreField | undefined;
    user: any;
    getUserCommitComment: (
        user: any,
        commentType: ('display_name' | 'email' | 'id')[],
    ) => string | undefined;
    lookerHostData?: { hostOrigin?: string; extensionId?: string };
    dry_run: boolean;
    add_access_grant: boolean;
    addStatus: (status: keyof typeof STATUS_MESSAGES, done?: boolean) => void;
}

const handleServerProxy = async ({
    headers,
    payload,
    api_url,
    extension,
}: {
    headers: Record<string, string>;
    payload: IBlendPayload;
    api_url: string;
    extension: ExtensionSDK;
}) => {
    try {
        const r = await extension.serverProxy(api_url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: headers,
        });
        return r;
    } catch (e) {
        console.error(e);
        throw e;
    }
};

const handleUpdateArtifacts = async ({
    sdk,
    body,
}: {
    sdk: Looker40SDK;
    body: IUpdateArtifact[];
}) => {
    // currently we are tracking artifacts, but not requerying them. Swallowing on purpose
    try {
        await sdk.ok(sdk.update_artifacts(ARTIFACT_NAMESPACE, body));
    } catch (e) {
        console.error('Failed to update artifact:', e);
    }
};

const getErrorMessage = (e: unknown): string => {
    let msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('Error: ')) {
        msg = msg.slice(7);
    }
    return msg;
};

export const handleLookMLBlend = async ({
    sdk,
    extension,
    queries,
    joins,
    first_query_connection,
    config,
    getExploreField,
    user,
    getUserCommitComment,
    lookerHostData,
    dry_run,
    add_access_grant,
    addStatus,
}: HandleLookMLBlendParams): Promise<
    | {
          success: boolean;
          error?: string;
          lookml?: string;
          explore_id?: string;
          explore_name?: string;
          lookml_model_name?: string;
          explore_url?: string;
      }
    | undefined
> => {
    let connection_name = first_query_connection;
    addStatus('get_model_information');

    // If no first_query_connection, try to get it from lookml_model_explore
    if (!connection_name && queries.length > 0) {
        try {
            const first_query = queries[0];
            const [model, explore] = first_query.explore.id.split('::');
            const model_explore = await sdk.ok(
                sdk.lookml_model_explore({
                    lookml_model_name: model,
                    explore_name: explore,
                }),
            );
            addStatus('get_model_explore', true);
            if (model_explore?.connection_name) {
                connection_name = model_explore.connection_name;
            }
        } catch (e) {
            console.error(
                'Failed to get connection from lookml_model_explore:',
                e,
            );
            return {
                success: false,
                error: getErrorMessage(e),
            };
        }
    }

    if (!connection_name) {
        return {
            success: false,
            error: 'No connection found for the first query. Please ensure the explore has a valid connection.',
        };
    }
    addStatus('get_connection_meta');
    const connection_meta = await sdk.ok(sdk.connection(connection_name));
    addStatus('get_connection_meta', true);
    if (!config) {
        console.error('No config available');
        return {
            success: false,
            error: 'Please configure the extension to use the LookML Blend feature.',
        };
    }
    if (!config.project_name?.length || !config.repo_name?.length) {
        return {
            success: false,
            error: 'Configuration error: missing Project Name and Repository Name',
        };
    }
    if (config.access_grants && !config.user_attribute?.length) {
        return {
            success: false,
            error: 'Configuration error: missing User Attribute',
        };
    }

    const query_sql = await getQuerySql(
        sdk,
        queries,
        joins,
        connection_name,
        config.use_stable_db_view,
        addStatus,
    );

    const fields: IBlendField[] = [];
    const aliases = queries.reduce((acc, q) => {
        acc[q.uuid] = q.alias || q.uuid;
        return acc;
    }, {} as { [key: string]: string });

    queries.forEach((q) => {
        q.fields.forEach((f) => {
            const found = getExploreField(q.explore.id, f.id);
            if (found) {
                fields.push({
                    name: f.id,
                    sql_alias: fieldTransform(
                        q.uuid,
                        f,
                        getConnectionDialect(connection_meta),
                        aliases,
                    ),
                    label_short: found.label_short,
                    view_label: getExploreLabelFromQuery(q),
                    type: found.lookml_type,
                    query_uuid: q.uuid,
                    field_type: found.type,
                    query_alias: aliases[q.uuid],
                });
            }
        });
    });
    const explore_ids = queries.map((q) => q.explore.id);
    const uuid = Array.from(crypto.getRandomValues(new Uint8Array(13)))
        .map((n) => String.fromCharCode(97 + (n % 26)))
        .join('');
    const payload_connection_name =
        config.collapse_connection && config.collapse_connection_name?.length
            ? config.collapse_connection_name
            : connection_meta.name || '';
    if (!payload_connection_name.length) {
        return {
            success: false,
            error: 'No connection name found',
        };
    }
    const payload: IBlendPayload = {
        uuid,
        url: lookerHostData?.hostOrigin,
        fields: fields,
        sql: query_sql,
        explore_ids: explore_ids,
        project_name: config.project_name,
        user_attribute: config.access_grants ? config.user_attribute! : '',
        repo_name: config.repo_name,
        includes: config.includes || '',
        lookml_model: getConnectionModel(
            connection_name,
            config.connection_model_mapping,
            config.collapse_connection,
            config.collapse_connection_model_name,
        ),
        connection_name: payload_connection_name,
        user_commit_comment: getUserCommitComment(
            user!,
            config.user_commit_comment || [],
        ),
        create_measures: config.create_measures || false,
        dry_run,
        add_access_grant,
    };
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-personal-access-token': extension.createSecretKeyTag(
            PERSONAL_ACCESS_TOKEN_USER_ATTRIBUTE,
        ),
        'x-base-url': lookerHostData?.hostOrigin || '',
        'x-webhook-secret': extension.createSecretKeyTag(
            WEBHOOK_SECRET_USER_ATTRIBUTE,
        ),
    };
    if (config.access_grants) {
        headers['x-client-id'] = extension.createSecretKeyTag(
            CLIENT_ID_USER_ATTRIBUTE,
        );
        headers['x-client-secret'] = extension.createSecretKeyTag(
            CLIENT_SECRET_USER_ATTRIBUTE,
        );
    }
    const api_url = config.override_api?.length ? config.override_api : API_URL;
    try {
        const r = await handleServerProxy({
            headers,
            payload,
            api_url,
            extension,
        });
        if (r.body.ok && dry_run) {
            return { success: true, ...r.body };
        } else if (!r.body.ok) {
            return { success: false, error: r.body.error };
        } else if (r.body.ok && !dry_run) {
            await handleUpdateArtifacts({
                sdk,
                body: [
                    {
                        key: getArtifactKey(
                            user!.id!,
                            payload.uuid,
                            explore_ids,
                        ),
                        value: stringify({
                            queries,
                            joins,
                            payload,
                            user_id: user.id,
                            explore_ids,
                            updated_at: new Date().toISOString(),
                        }),
                        content_type: 'application/json',
                    },
                ],
            });
            addStatus('get_new_explore_data');
            for (var i = 0; i < EXPLORE_POLL_RETRIES; i++) {
                try {
                    const _explore = await sdk.ok(
                        sdk.lookml_model_explore({
                            lookml_model_name: r.body.lookml_model_name,
                            explore_name: r.body.explore_name,
                            fields: 'id',
                        }),
                    );
                    if (_explore.id) {
                        break;
                    }
                } catch (e) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, EXPLORE_POLL_DELAY),
                    );
                }
            }
            addStatus('get_new_explore_data', true);
            extension.openBrowserWindow(r.body.explore_url, '_blank');
            return { success: true, ...r.body };
        }
    } catch (e) {
        console.error(e);
        return {
            success: false,
            error: getErrorMessage(e),
        };
    }
};

interface HandleBlendParams {
    sdk: Looker40SDK;
    extension: any;
    queries: IQuery[];
    joins: { [key: string]: IQueryJoin };
    first_query_connection: string | undefined;
    config: any;
    search_params: URLSearchParams;
    lookerHostData?: { hostOrigin?: string; extensionId?: string };
}

export const handleBlend = async ({
    sdk,
    extension,
    queries,
    joins,
    first_query_connection,
    config,
    lookerHostData,
}: HandleBlendParams): Promise<{
    success: boolean;
    error?: string;
}> => {
    if (!config) {
        console.error('No config available');
        return {
            success: false,
            error: 'No config available',
        };
    }
    if (!first_query_connection) {
        console.error('No connection found');
        return {
            success: false,
            error: 'No connection found',
        };
    }
    const query_sql = await getQuerySql(
        sdk,
        queries,
        joins,
        first_query_connection,
        config.use_stable_db_view,
    );
    try {
        const create_sql = await sdk.ok(
            sdk.create_sql_query({
                sql: query_sql,
                connection_name: first_query_connection,
            }),
        );
        if (create_sql.slug) {
            const _run_sql = await sdk.ok(
                sdk.run_sql_query(create_sql.slug, 'json'),
            );
            const url = `/extensions/${lookerHostData?.extensionId}/blended/${create_sql.slug}`;
            extension.openBrowserWindow(url, '_blank');
            return { success: true };
        } else {
            return {
                success: false,
                error: 'Failed to create SQL query',
            };
        }
    } catch (e) {
        console.error(e);
        return {
            success: false,
            error: 'Failed to create SQL query, do you have permission to run SQL queries in Looker?',
        };
    }
};
