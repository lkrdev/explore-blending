import { getEmbedSDK } from '@looker/embed-sdk';
import React, { useEffect } from 'react';
import { useBoolean, useDebounceValue } from 'usehooks-ts';
import { useAppContext } from '../../AppContext';
import { EmbedContainer } from '../../components/EmbedContainer';
import useExtensionSdk from '../../hooks/useExtensionSdk';
import useSdk from '../../hooks/useSdk';
import { useBlendContext } from '../Context';
const EmbedExplore: React.FC<{
    initial_query_id: string;
    explore_id: string;
    uuid: string;
    explore_label: string;
    doneLoading?: () => void;
    startLoading?: () => void;
}> = ({
    initial_query_id,
    explore_id,
    uuid,
    explore_label,
    doneLoading,
    startLoading,
}) => {
    const { getExploreField } = useAppContext();
    const { updateQuery, embed_connection, setEmbedConnection } =
        useBlendContext();
    const ready = useBoolean(false);
    const [debouncedQueryId, setDebouncedQueryId] = useDebounceValue(
        initial_query_id,
        1000
    );
    const extension = useExtensionSdk();
    const sdk = useSdk();
    const hostUrl = extension?.lookerHostData?.hostUrl;
    const ref = React.useRef<HTMLDivElement>(null);

    const preload = async () => {
        if (
            !embed_connection &&
            hostUrl &&
            ref.current &&
            ref.current.childNodes.length === 0
        ) {
            getEmbedSDK().init(hostUrl);
            const embed_sdk = getEmbedSDK().preload().appendTo(ref.current);
            embed_sdk.on('page:changed', onPageChanged);
            embed_sdk.on('explore:ready', () => {
                doneLoading?.();
            });
            const build = embed_sdk.build();
            const connection = await build.connect({ waitUntilLoaded: true });
            setEmbedConnection(connection);
            ready.setTrue();
        }
    };

    useEffect(() => {
        preload();
    }, [embed_connection, hostUrl, ref.current]);

    useEffect(() => {
        getQueryMetadata(debouncedQueryId || '');
    }, [debouncedQueryId]);

    const getQueryMetadata = async (qid: string) => {
        if (qid?.length) {
            try {
                const metadata = await sdk?.ok(sdk?.query(qid));
                // short circuit if no fields
                if (!metadata.fields?.length) {
                    return;
                }
                let newQuery: IQuery = {
                    uuid,
                    query_id: qid,
                    explore: {
                        id: explore_id,
                        label: explore_label,
                    },
                    fields: [],
                };
                let dynamic_fields_map: Record<string, { label: string; type: 'dimension' | 'measure'; is_table_calc?: boolean; lookml_type?: string }> = {};
                if (metadata.dynamic_fields) {
                    try {
                        const parsedDynamicFields = JSON.parse(metadata.dynamic_fields as string);
                        if (Array.isArray(parsedDynamicFields)) {
                            parsedDynamicFields.forEach((df: any) => {
                                const kind = df.category || df._kind_hint;
                                if ((kind === 'dimension' || df.dimension) && !df.table_calculation) {
                                    dynamic_fields_map[df.dimension] = {
                                        label: df.label || df.dimension,
                                        type: 'dimension',
                                        lookml_type: df._type_hint || df.type || 'string',
                                    };
                                } else if ((kind === 'measure' || df.measure) && !df.table_calculation) {
                                    dynamic_fields_map[df.measure] = {
                                        label: df.label || df.measure,
                                        type: 'measure',
                                        lookml_type: df._type_hint || df.type || 'number',
                                    };
                                } else if (kind === 'table_calculation' || df.table_calculation) {
                                    dynamic_fields_map[df.table_calculation] = {
                                        label: df.label || df.table_calculation,
                                        type: 'dimension',
                                        is_table_calc: true,
                                    };
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Failed to parse dynamic_fields', e);
                    }
                }

                if (metadata.fields?.length) {
                    newQuery.fields = metadata.fields
                        .filter((field: string) => {
                            return !dynamic_fields_map[field]?.is_table_calc;
                        })
                        .map((field: string) => {
                            const field_metadata = getExploreField(explore_id, field);
                            const dyn_field = dynamic_fields_map[field];
                            return {
                                id: field,
                                label: field_metadata?.label || dyn_field?.label || field,
                                type: field_metadata?.type || dyn_field?.type || 'dimension',
                                is_dynamic: !!dyn_field,
                                lookml_type: dyn_field?.lookml_type,
                            };
                        });
                }
                updateQuery(newQuery);
            } catch (error) {
                console.error(
                    `Failed to fetch query metadata for qid: ${qid}`,
                    error
                );
            }
        }
    };

    const onPageChanged = async (event: any) => {
        const url = new URL(event.page.absoluteUrl);
        const qid = url.searchParams.get('qid');
        setDebouncedQueryId(qid || '');
    };

    return (
        <>
            <EmbedContainer ref={ref} />
            {embed_connection && ready.value && (
                <Updater
                    explore_id={explore_id}
                    initial_query_id={initial_query_id}
                    startLoading={startLoading}
                    doneLoading={doneLoading}
                />
            )}
        </>
    );
};

const Updater = ({
    explore_id,
    initial_query_id,
    startLoading,
    doneLoading,
}: {
    explore_id: string;
    initial_query_id: string;
    startLoading?: () => void;
    doneLoading?: () => void;
}) => {
    const explore_ref = React.useRef<string>('');
    const qid_ref = React.useRef<string>('');
    const { embed_connection } = useBlendContext();

    useEffect(() => {
        if (explore_ref.current !== explore_id) {
            explore_ref.current = explore_id;
            qid_ref.current = initial_query_id;
            setExplore(explore_id, initial_query_id);
        } else if (qid_ref.current !== initial_query_id) {
            qid_ref.current = initial_query_id;
            preloadSetExplore(explore_id, initial_query_id);
        }
    }, [explore_id, initial_query_id]);

    const setExplore = async (explore_id: string, qid: string) => {
        if (embed_connection) {
            startLoading?.();
            await embed_connection.loadExplore({
                id: explore_id,
                params: {
                    qid,
                },
                options: {
                    waitUntilLoaded: true,
                },
            });
            doneLoading?.();
        } else {
            console.error('embed connection not set');
        }
    };

    const preloadSetExplore = async (explore_id: string, qid: string) => {
        if (embed_connection) {
            startLoading?.();
            await embed_connection.loadExplore({
                id: explore_id,
                params: {
                    qid,
                },
                options: {
                    waitUntilLoaded: true,
                },
            });
            doneLoading?.();
        } else {
            console.error('embed connection not set');
        }
    };
    return <></>;
};

export default EmbedExplore;
