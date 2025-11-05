import {
    Box,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    Icon, // Ensure Popover is imported
    Space,
    Tooltip,
} from '@looker/components';
import { Warning } from '@styled-icons/material';
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useBoolean } from 'usehooks-ts';
import LoadingButton from '../../components/ProgressButton'; // Assuming LoadingButtonProps requires is_loading
import useSdk from '../../hooks/useSdk';
import { useSettings } from '../../SettingsContext';
import { useBlendButtonContext } from './BlendButtonContext';
import TabsComponent, { SelectedTabComponent } from './Tabs';
import Lookml from './Tabs/Lookml';

interface BlendDialogProps {
    onClose: () => void;
    handleBlend: () => Promise<void>;
    getQuerySql: () => Promise<string>;
}

export const BlendDialog: React.FC<BlendDialogProps> = ({
    onClose,
    handleBlend,
    getQuerySql,
}) => {
    const { toggle } = useBlendButtonContext();
    const [sql, setSql] = useState<string | undefined>();
    const sdk = useSdk();
    const { config } = useSettings();

    const workspace = useSWR('workspace', () => {
        return sdk.ok(sdk.session());
    });

    useEffect(() => {
        getSql();
    }, []);

    const getSql = async () => {
        const sql = await getQuerySql();
        setSql(sql);
    };

    const loading = typeof sql === 'undefined';
    const loading_button = useBoolean(false);

    return (
        <Dialog isOpen={true} width="60vw" onClose={onClose} height="90vh">
            <DialogHeader>
                <TabsComponent />
            </DialogHeader>
            <DialogContent>
                {SelectedTabComponent[toggle || 'queries']}
                {/* preload lookml */}
                <Lookml display={false} />
            </DialogContent>

            <DialogFooter>
                <Box display="flex" justifyContent="flex-end" width="100%">
                    <Space between>
                        {/* Blend Button - Add is_loading prop back */}
                        <LoadingButton
                            fullWidth
                            is_loading={loading_button.value} // *** FIX: Add this prop back ***
                            disabled={loading_button.value || loading}
                            color="key"
                            // flexGrow={false} // Keep other props if needed
                            onClick={async () => {
                                loading_button.setTrue();
                                await handleBlend();
                                onClose();
                                loading_button.setFalse();
                            }}
                        >
                            Blend
                        </LoadingButton>
                        {workspace?.data?.workspace_id === 'dev' &&
                        config?.lookml ? (
                            <Tooltip content="It is not recommended to blend in development mode, your developer copy may not have the new LookML model created">
                                <Icon icon={<Warning size={24} />} />
                            </Tooltip>
                        ) : null}
                    </Space>
                </Box>
            </DialogFooter>
        </Dialog>
    );
};
