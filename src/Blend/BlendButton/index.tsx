import { IconButton, Label, Space, SpaceVertical } from '@looker/components';
import { JoinInner } from '@styled-icons/material';
import { set } from 'lodash';
import React, { useState } from 'react';
import { useTheme } from 'styled-components';
import { useBoolean } from 'usehooks-ts';
import { useAppContext } from '../../AppContext';
import LoadingButton from '../../components/ProgressButton';
import useExtensionSdk from '../../hooks/useExtensionSdk';
import useSdk from '../../hooks/useSdk';
import { useSearchParams } from '../../hooks/useSearchParams';
import { useSettings } from '../../SettingsContext';
import {
    handleBlend,
    handleLookMLBlend,
    STATUS_MESSAGES,
} from '../../utils/getBlend';
import { useBlendContext } from '../Context';
import BlendButtonProvider, {
    useBlendButtonContext,
} from './BlendButtonContext';
import { BlendDialog } from './BlendDialog';

interface BlendButtonProps {}

const BlendButton: React.FC<BlendButtonProps> = ({}) => {
    const [status, setStatus] = useState<{ message: string; done: boolean }[]>(
        []
    );
    const { queries, joins, first_query_connection } = useBlendContext();
    const { toggle, setToggle, invalid_joins, invalid_joins_text } =
        useBlendButtonContext();
    const theme = useTheme();
    const loading = useBoolean(false);
    const sdk = useSdk();
    const extension = useExtensionSdk();
    const { lookerHostData } = extension;
    const { search_params } = useSearchParams();
    const { getExploreField, user } = useAppContext();
    const { config, getUserCommitComment } = useSettings();
    const [error, setError] = useState<string | undefined>();

    const addStatus = (
        status: keyof typeof STATUS_MESSAGES,
        done: boolean = false
    ) => {
        setStatus((p) => {
            const new_p: { message: string; done: boolean }[] = [...p];
            const index = new_p.findIndex(
                (s) => s.message === STATUS_MESSAGES[status]
            );
            if (index > -1) {
                set(new_p, index, { message: STATUS_MESSAGES[status], done });
            } else {
                new_p.push({ message: STATUS_MESSAGES[status], done });
            }
            return new_p;
        });
    };

    const handleLookMLBlendWrapper: () => Promise<{
        success: boolean;
        error?: string;
    }> = async () => {
        const result = await handleLookMLBlend({
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
            dry_run: false,
            add_access_grant: config?.access_grants || false,
            addStatus: addStatus,
        });
        return result;
    };

    const handleBlendWrapper = async () => {
        setError(undefined);
        loading.setTrue();
        if (!config) {
            console.error('No config available');
            loading.setFalse();
            return;
        }
        if (config.lookml) {
            const result = await handleLookMLBlendWrapper();
            if (!result.success) {
                setError(result.error);
            }
            loading.setFalse();
            return;
        }
        const result = await handleBlend({
            sdk,
            extension,
            queries,
            joins,
            first_query_connection,
            config,
            search_params,
            lookerHostData,
        });
        if (!result.success) {
            setError(result.error);
        }
        loading.setFalse();
    };

    return (
        <SpaceVertical width="100%" gap="xsmall">
            {error && <Label>{error}</Label>}
            <Space align="center" gap="small">
                {' '}
                <LoadingButton
                    is_loading={loading.value}
                    onClick={() => setToggle('queries')}
                >
                    Blend
                </LoadingButton>
                <IconButton
                    size="medium"
                    onClick={() => setToggle('joins')}
                    icon={
                        <JoinInner
                            color={
                                invalid_joins?.length > 0
                                    ? theme.colors.critical
                                    : undefined
                            }
                            size={24}
                        />
                    }
                    label={invalid_joins_text}
                />
            </Space>
            {toggle && (
                <BlendDialog
                    error={error}
                    setError={setError}
                    onClose={() => setToggle(false)}
                    handleBlend={handleBlendWrapper}
                />
            )}
        </SpaceVertical>
    );
};

const BlendButtonWrapper = () => {
    return (
        <BlendButtonProvider>
            <BlendButton />
        </BlendButtonProvider>
    );
};

export default BlendButtonWrapper;
