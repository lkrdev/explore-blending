import { Box, Code, Paragraph, SpaceVertical } from '@looker/components';
import { set } from 'lodash';
import React, { useState } from 'react';
import useSWR from 'swr';
import { useAppContext } from '../../../AppContext';
import CopyClipboard from '../../../components/CopyClipboard';
import useExtensionSdk from '../../../hooks/useExtensionSdk';
import useSdk from '../../../hooks/useSdk';
import { useSearchParams } from '../../../hooks/useSearchParams';
import { useSettings } from '../../../SettingsContext';
import { handleLookMLBlend, STATUS_MESSAGES } from '../../../utils/getBlend';
import { useBlendContext } from '../../Context';
var stringify = require('fast-stable-stringify');

const Lookml = ({ display = true }: { display?: boolean }) => {
    const [status, setStatus] = useState<{ message: string; done: boolean }[]>(
        [],
    );
    const { queries, joins, first_query_connection } = useBlendContext();
    const sdk = useSdk();
    const extension = useExtensionSdk();
    const { config, getUserCommitComment, can_update_settings } = useSettings();
    const { search_params } = useSearchParams();
    const { getExploreField, user } = useAppContext();
    const { lookerHostData } = extension;
    const should_run = queries.length > 0 && first_query_connection?.length;

    const addStatus = (
        status: keyof typeof STATUS_MESSAGES,
        done: boolean = false,
    ) => {
        setStatus((p) => {
            const new_p = [...p];
            const index = new_p.findIndex(
                (s) => s.message === STATUS_MESSAGES[status],
            );
            if (index > -1) {
                set(new_p, index, { message: STATUS_MESSAGES[status], done });
            } else {
                new_p.push({ message: STATUS_MESSAGES[status], done });
            }
            return new_p;
        });
    };
    const lookml = useSWR(
        should_run
            ? stringify({ queries, joins, first_query_connection }) + '-lookml'
            : null,
        () => {
            return handleLookMLBlend({
                sdk,
                extension,
                queries,
                joins,
                first_query_connection,
                config: config!,
                search_params,
                getExploreField,
                user: user!,
                getUserCommitComment,
                lookerHostData,
                dry_run: true,
                add_access_grant: config?.access_grants || false,
                addStatus: addStatus,
            });
        },
    );

    if (!display) return null;
    if (!first_query_connection) {
        return (
            <div>
                No connection found for the first query, may need to reset model
                cache within the Explore blend settings.
                {!can_update_settings &&
                    'Please reach out to your administrator to update the settings.'}
            </div>
        );
    } else if (lookml.isLoading) {
        return (
            <SpaceVertical>
                <Paragraph>Generating LookML... </Paragraph>
            </SpaceVertical>
        );
    } else if (lookml.error) {
        return (
            <SpaceVertical>Error: {JSON.stringify(lookml.error)}</SpaceVertical>
        );
    } else if (!lookml.data?.success) {
        let lookml_data = lookml.data?.lookml;
        if (!lookml_data) {
            lookml_data = '-- No LookML generated --';
            if (lookml.data?.error) {
                lookml_data += `\n\nError: ${lookml.data.error}`;
            }
        }
        return (
            <Box position='relative' height='100%' width='100%'>
                {lookml_data}
            </Box>
        );
    } else if (lookml.data?.success) {
        return (
            <Box position='relative' height='100%' width='100%'>
                <CopyClipboard
                    text={lookml.data!.lookml!}
                    label='Copy LookML'
                    size={16}
                />

                <Code
                    fontSize='xxsmall'
                    style={{
                        height: '100%',
                        width: '100%',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                    }}
                    lang='sql'
                >
                    {lookml.data!.lookml!}
                </Code>
            </Box>
        );
    } else return <>Unknown error</>;
};

export default Lookml;
