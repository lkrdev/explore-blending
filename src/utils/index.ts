import { IDBConnection, IUser } from '@looker/sdk';
import snakeCase from 'lodash/snakeCase';
import { ConfigFormData } from '../SettingsContext';

export const getDefaultConnectionModel = (conn_name: string) => {
    return `blend_${snakeCase(conn_name)}`;
};

export const getConnectionModel = (
    conn_name: string,
    connnection_config_mapping: ConfigFormData['connection_model_mapping'],
    collapse_connection: boolean | undefined,
    collapse_connection_model_name: string | undefined
) => {
    if (collapse_connection && collapse_connection_model_name?.length) {
        return collapse_connection_model_name;
    } else {
        const found = connnection_config_mapping?.[conn_name];
        if (found?.model_name && found.model_name.length) {
            return found.model_name;
        } else {
            return getDefaultConnectionModel(conn_name);
        }
    }
};

export const getUserCommitComment = (
    user: IUser | undefined,
    user_commit_comment: ConfigFormData['user_commit_comment']
) => {
    if (!user || !user_commit_comment || !user_commit_comment.length) {
        return undefined;
    }
    let comment = '# Blended by: ';
    const out: string[] = [];
    user_commit_comment.forEach((comment) => {
        if (comment === 'display_name') {
            out.push(user.display_name || '');
        }
        if (comment === 'email') {
            out.push(user.email || '');
        }
        if (comment === 'id') {
            out.push(`Looker User ID (${user.id!})`);
        }
    });
    return comment + out.join(' - ');
};

export const getConnectionDialect = (connection_meta: IDBConnection) => {
    return connection_meta.dialect_name || connection_meta.dialect?.name || '';
};
