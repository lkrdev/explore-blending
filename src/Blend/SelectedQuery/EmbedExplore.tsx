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
            if (metadata.fields?.length) {
                newQuery.fields = metadata.fields.map((field: string) => {
                    const field_metadata = getExploreField(explore_id, field);
                    return {
                        id: field,
                        label: field,
                        type: field_metadata?.type || 'dimension',
                    };
                });
            }
            updateQuery(newQuery);
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
