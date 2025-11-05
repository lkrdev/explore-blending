import {
    Box,
    FadeIn,
    Heading,
    ProgressCircular,
    Space,
    SpaceVertical,
    Span,
} from '@looker/components';
import { forEach, set, uniq, uniqueId } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useBoolean } from 'usehooks-ts';
import { useAppContext } from '../AppContext';
import LearnMoreInfoButton from '../components/Guide/LearnMoreInfoButton';
import LkrLoading from '../components/LkrLoading';
import { APP_NAME } from '../constants';
import useSdk from '../hooks/useSdk';
import { useSearchParams } from '../hooks/useSearchParams';
import { SettingsIconButton } from '../Settings';
import { useSettings } from '../SettingsContext';
import BlendButton from './BlendButton';
import { BlendContextProvider, useBlendContext } from './Context';
import NewExplore from './NewExplore';
import NoQueries from './NoQueries';
import { QueryList } from './QueryList';
import ResetButton from './ResetButton';
import SelectedQuery from './SelectedQuery';
interface BlendProps {}

const Blend: React.FC<BlendProps> = () => {
    const { config } = useSettings();
    const { queries, selectedQuery } = useBlendContext();

    return (
        <Box height="100%" width="100%" overflow="hidden" display="flex">
            {/* Sidebar */}
            {queries.length > 0 && (
                <SpaceVertical
                    gap="none"
                    width={300}
                    height="100%"
                    p="small"
                    style={{ borderRight: '1px solid #e1e1e1' }}
                >
                    <SpaceVertical
                        gap="small"
                        justify="start"
                        style={{ height: '100%', minHeight: 0 }}
                    >
                        <Space between mb="medium" align="center">
                            <Heading as="h3">
                                {config?.use_extension_label
                                    ? window.lookerExtensionMetadata.label
                                    : APP_NAME}
                            </Heading>
                            <Space gap="none" width="fit-content">
                                <ResetButton />
                                <SettingsIconButton />
                                <LearnMoreInfoButton />
                            </Space>
                        </Space>
                        <SpaceVertical
                            gap="small"
                            width="100%"
                            style={{ minHeight: 0 }}
                        >
                            <QueryList />
                            <NewExplore />
                        </SpaceVertical>
                        <Box flexGrow={1} />
                        <BlendButton />
                    </SpaceVertical>
                </SpaceVertical>
            )}

            {/* Main Content */}
            <Box flex={1} height="100%" position="relative">
                {queries.length === 0 && <NoQueries />}
                {queries.length > 0 && Boolean(selectedQuery?.uuid) && (
                    <SelectedQuery />
                )}
            </Box>
        </Box>
    );
};

const BlendBase: React.FC = () => {
    const loading = useBoolean(true);
    const { search_params } = useSearchParams();
    const blend_data = search_params.get('b');
    const [hydratedBlendData, setHydratedBlendData] = useState<IBlendData>();
    const { models, getExploreFields, status, ready } = useAppContext();
    const { config } = useSettings();

    const sdk = useSdk();
    useEffect(() => {
        if (models.length > 0) {
            getBlendQueries();
        }
    }, [models]);

    const explores = useMemo(() => {
        return models.reduce((acc, model) => {
            model.explores?.forEach((explore) => {
                if (explore.hidden) {
                    return;
                } else {
                    const explore_id = `${model.name}::${explore.name}`;
                    acc[explore_id] = {
                        id: explore_id,
                        label: explore.label!,
                    };
                }
            });
            return acc;
        }, {} as { [key: string]: { id: string; label: string } });
    }, [models]);

    const getBlendQueries = async () => {
        if (!blend_data) {
            loading.setFalse();
            return;
        } else {
            const blend_data_json: IBlendQueryOutput = JSON.parse(
                atob(blend_data)
            ) as IBlendQueryOutput;
            const query_promises = blend_data_json.queries.map(
                async (query_id: string) => {
                    return sdk.ok(sdk.query(query_id));
                }
            );
            const query_responses = await Promise.all(query_promises);
            const explores_ids = uniq(
                query_responses.map((q) => `${q.model}::${q.view}`)
            );
            const _explore_fields = await Promise.all(
                explores_ids.map(getExploreFields)
            );
            const fields = _explore_fields.reduce((acc, explore_fields, i) => {
                const explore_id = explores_ids[i];
                acc[explore_id] = explore_fields;
                return acc;
            }, {} as { [key: string]: { [key: string]: IExploreField } });

            const queries: IQuery[] = query_responses.reduce((acc, q, k) => {
                const explore_id = `${q.model}::${q.view}`;
                const explore = explores[explore_id];
                const query_fields = (q.fields || []).map(
                    (f) => fields[explore_id][f]
                );

                if (!explore) {
                    console.error(`Explore ${explore_id} not found`);
                    return acc;
                } else {
                    let item = {
                        uuid: blend_data_json.query_uuids[k] || uniqueId('q_'),
                        query_id: q.client_id!,
                        explore: {
                            id: explore.id,
                            label: explore.label,
                        },
                        fields: query_fields,
                        alias: blend_data_json.aliases[k],
                    };
                    acc.push(item);
                }
                return acc;
            }, [] as IQuery[]);

            forEach(blend_data_json.nel_i, (value, index) => {
                set(
                    queries,
                    [value, 'explore', 'new_label'],
                    blend_data_json.new_explore_labels[index]
                );
            });
            forEach(blend_data_json.a_i, (value, index) => {
                set(queries, [value, 'alias'], blend_data_json.aliases[index]);
            });
            forEach(blend_data_json.l_i, (value) => {
                set(queries, [value, 'respect_limit'], true);
            });
            const translated_joins: { [key: string]: IQueryJoin } = {};
            blend_data_json.joins.forEach((join, i) => {
                if (join) {
                    const query = queries[i];
                    if (!query) {
                        console.error(`Query ${i} not found`);
                    } else {
                        translated_joins[query.uuid] = {
                            to_query_id: query.uuid,
                            type: join.type,
                            joins: join.joins.map((j) => ({
                                uuid: uniqueId('j_'),
                                from_query_id:
                                    queries[j.from_query_index]?.uuid || '',
                                to_query_id: query.uuid,
                                from_field: j.from_field,
                                to_field: j.to_field,
                            })),
                        };
                    }
                }
            });
            setHydratedBlendData({
                queries: queries.filter((q) => !!q),
                joins: translated_joins,
            });
            loading.setFalse();
        }
    };

    if (loading.value || !ready) {
        const can_display_loading = Boolean(config);
        return (
            <Box
                display="grid"
                style={{
                    gridTemplateRows: '0.75fr fit-content(100%) 1fr',
                }}
                height="100%"
                width="100%"
            >
                <Box />
                {can_display_loading && config?.display_loading_status ? (
                    <Box margin="0 auto" p="medium">
                        <LkrLoading duration={750} />
                    </Box>
                ) : (
                    <Box margin="0 auto" p="medium">
                        <ProgressCircular size="large" />
                    </Box>
                )}
                <SpaceVertical
                    gap="none"
                    flexGrow={1}
                    textAlign="center"
                    justify="start"
                    align="center"
                >
                    {config?.display_loading_status &&
                        status.map((s, i) => (
                            <FoldInStatus key={i}>{s}</FoldInStatus>
                        ))}
                </SpaceVertical>
            </Box>
        );
    } else {
        return (
            <BlendContextProvider blend_data={hydratedBlendData}>
                <Blend />
            </BlendContextProvider>
        );
    }
};

const FoldInStatus: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    return (
        <FadeIn delay="intricate" duration="intricate">
            <Span fontSize="xxsmall">{children}</Span>
        </FadeIn>
    );
};

export default BlendBase;
