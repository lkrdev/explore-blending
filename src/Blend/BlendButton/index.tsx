import { IconButton, Space, SpaceVertical } from '@looker/components';
import { JoinInner } from '@styled-icons/material';
import React from 'react';
import { useTheme } from 'styled-components';
import { useAppContext } from '../../AppContext';
import LoadingButton from '../../components/ProgressButton';
import useExtensionSdk from '../../hooks/useExtensionSdk';
import useSdk from '../../hooks/useSdk';
import { useSearchParams } from '../../hooks/useSearchParams';
import { useSettings } from '../../SettingsContext';
import { handleBlend, handleLookMLBlend } from '../../utils/getBlend';
import { useBlendContext } from '../Context';
import BlendButtonProvider, {
    useBlendButtonContext,
} from './BlendButtonContext';
import { BlendDialog } from './BlendDialog';
import { StatusMessage } from './StatusMessage';

interface BlendButtonProps {}

const BlendButton: React.FC<BlendButtonProps> = ({}) => {
    const {
        toggle,
        setToggle,
        invalid_joins,
        invalid_joins_text,
        addStatus,
        setSuccess,
        setError,
        loading,
        resetStatus,
    } = useBlendButtonContext();
    const theme = useTheme();
    const sdk = useSdk();
    const extension = useExtensionSdk();
    const { lookerHostData } = extension;
    const { search_params } = useSearchParams();
    const { getExploreField, user } = useAppContext();
    const { config, getUserCommitComment } = useSettings();
    const { queries, joins, first_query_connection } = useBlendContext();

    const handleLookMLBlendWrapper: () => Promise<
        | {
              success: boolean;
              error?: string;
          }
        | undefined
    > = async () => {
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
        setSuccess(false);
        resetStatus();
        loading.setTrue();
        if (!config) {
            console.error('No config available');
            loading.setFalse();
            return;
        }
        if (config.lookml) {
            const result = await handleLookMLBlendWrapper();
            if (!result) {
                loading.setFalse();
                return;
            }
            if (!result.success) {
                setError(result.error || 'Unknown error');
            } else {
                setSuccess(true);
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
        } else {
            setSuccess(true);
        }
        loading.setFalse();
    };

    return (
        <SpaceVertical width='100%' gap='xsmall'>
            <StatusMessage />
            <Space align='center' gap='small'>
                {' '}
                <LoadingButton
                    is_loading={loading.value}
                    onClick={() => setToggle('queries')}
                >
                    Blend
                </LoadingButton>
                <IconButton
                    size='medium'
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
