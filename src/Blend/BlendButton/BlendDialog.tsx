import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    Icon,
    Label, // Ensure Popover is imported
    Space,
    SpaceVertical,
    Tooltip,
} from '@looker/components';
import { Warning } from '@styled-icons/material';
import React from 'react';
import styled from 'styled-components';
import useSWR from 'swr';
import LoadingButton from '../../components/ProgressButton'; // Assuming LoadingButtonProps requires is_loading
import useSdk from '../../hooks/useSdk';
import { useSettings } from '../../SettingsContext';
import { useBlendButtonContext } from './BlendButtonContext';
import { StatusMessage } from './StatusMessage';
import TabsComponent, { SelectedTabComponent } from './Tabs';
import Lookml from './Tabs/Lookml';

const StyledDialogContent = styled(DialogContent)`
    padding: ${({ theme }) => theme.space.none}
        ${({ theme }) => theme.space.xsmall};
    margin-bottom: ${({ theme }) => theme.space.medium};
`;

const StyledDialogHeader = styled(DialogHeader)`
    padding: ${({ theme }) => theme.space.xsmall}
        ${({ theme }) => theme.space.xsmall};
`;

interface BlendDialogProps {
    onClose: () => void;
    handleBlend: () => Promise<void>;
}

export const BlendDialog: React.FC<BlendDialogProps> = ({
    onClose,
    handleBlend,
}) => {
    const sdk = useSdk();
    const { toggle, loading, invalid_joins, error } = useBlendButtonContext();
    const { config } = useSettings();

    const workspace = useSWR('workspace', () => {
        return sdk.ok(sdk.session());
    });

    return (
        <Dialog isOpen={true} width='60vw' onClose={onClose} height='90vh'>
            <StyledDialogHeader>
                <TabsComponent />
            </StyledDialogHeader>
            <StyledDialogContent>
                {SelectedTabComponent[toggle || 'queries']}
                {/* preload lookml */}
                <Lookml display={false} />
            </StyledDialogContent>

            <DialogFooter>
                <SpaceVertical gap='small'>
                    {invalid_joins.length > 0 && (
                        <Label color='critical'>
                            Please fix your invalid joins
                        </Label>
                    )}
                    <SpaceVertical gap='none'>
                        <StatusMessage />
                        <Space between justify='end'>
                            <LoadingButton
                                fullWidth
                                is_loading={loading.value}
                                disabled={
                                    loading.value || invalid_joins.length > 0
                                }
                                color='key'
                                onClick={async () => {
                                    loading.setTrue();
                                    await handleBlend();
                                    onClose();
                                    loading.setFalse();
                                }}
                            >
                                Blend
                            </LoadingButton>
                            {workspace?.data?.workspace_id === 'dev' &&
                            config?.lookml ? (
                                <Tooltip content='It is not recommended to blend in development mode, your developer copy may not have the new LookML model created'>
                                    <Icon icon={<Warning size={24} />} />
                                </Tooltip>
                            ) : null}
                        </Space>
                    </SpaceVertical>
                </SpaceVertical>
            </DialogFooter>
        </Dialog>
    );
};
