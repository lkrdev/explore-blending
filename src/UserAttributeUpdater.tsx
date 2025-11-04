import { Box, Button, List, ListItem, Paragraph } from '@looker/components';
import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useAppContext } from './AppContext';
import { API_URL } from './constants';
import useExtensionSdk from './hooks/useExtensionSdk';
import { useSettings } from './SettingsContext';
import {
    TUpdateUserAttributes,
    updateUserAttributes,
} from './utils/updateUserAttributes';

export const UserAttributeUpdater = () => {
    const extensionSdk = useExtensionSdk();
    const rendering = extensionSdk.lookerHostData?.isRendering;
    const { config, loading } = useSettings();
    const { checkEntitlements, ready } = useAppContext();
    const check = checkEntitlements();
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<false | number>(false);
    const [erroringUsers, setErroringUsers] = useState<
        | {
              user_id: string;
              error: string;
              group_ua_value: string;
          }[]
        | null
    >(null);
    const has_user_attribute = Boolean(config?.user_attribute?.length);
    const has_override_api = Boolean(config?.override_api?.length);

    const handleUpdate = async () => {
        setError(null);
        setDone(false);
        setErroringUsers(null);
        const response = await updateUserAttributes({
            extension: extensionSdk,
            user_attribute_name: config!.user_attribute!,
            override_api: has_override_api ? config?.override_api : undefined,
        });
        if (!response.success && 'error' in response) {
            setError(response.error || 'Unknown error');
        } else {
            setError(null);
        }
        if (response.success) {
            setDone(response.number_of_users_updated ?? 0);
        }
        if (
            'erroring_users' in response &&
            response.erroring_users &&
            response.erroring_users?.length
        ) {
            setErroringUsers(response.erroring_users);
        }
        return response;
    };

    if (!(ready && !loading)) {
        return <Box p="large"></Box>;
    } else if (!has_user_attribute) {
        return (
            <Box p="large" color="error">
                No user attribute configured, please configure a user attribute
                in the settings from the application
            </Box>
        );
    } else if (
        has_override_api &&
        !check.current_entitlements.external_api_urls.includes(
            new URL(config!.override_api!).origin
        )
    ) {
        return (
            <Box p="large" color="error">
                Missing entitlements, please ensure the override API (
                {`${config!.override_api!}`}) is added to the extension
                entitlement for external_api_urls and in the override API
                extension settings
            </Box>
        );
    } else if (
        !has_override_api &&
        check.current_entitlements.external_api_urls.includes(API_URL)
    ) {
        return (
            <Box p="large" color="error">
                Please check the extension entitlement for external_api_urls and
                ensure it includes {`${API_URL}`} or provide an override API
            </Box>
        );
    } else if (rendering) {
        return <RunUpdate handleUpdate={handleUpdate} />;
    } else {
        return (
            <Box p="large">
                <Button onClick={handleUpdate}>Update User Attributes</Button>
                <Paragraph color="error">{error}</Paragraph>
                <Paragraph color="success">
                    {done ? `Updated ${done} users` : ''}
                </Paragraph>
                {erroringUsers && erroringUsers?.length > 0 && (
                    <Paragraph color="error">
                        <List>
                            {erroringUsers.map((user) => (
                                <ListItem key={user.user_id}>
                                    {user.error}
                                </ListItem>
                            ))}
                        </List>
                    </Paragraph>
                )}
            </Box>
        );
    }
};

const RunUpdate = ({
    handleUpdate,
}: {
    handleUpdate: () => ReturnType<TUpdateUserAttributes>;
}) => {
    const data = useSWR('run-update', handleUpdate);
    const extensionSdk = useExtensionSdk();

    const renderRef = useRef<string | null>(null);

    useEffect(() => {
        // run rendered only once
        if (data.data) {
            if (!renderRef.current) {
                if (
                    ('erroring_users' in data.data &&
                        data.data.erroring_users?.length &&
                        data.data.erroring_users?.length > 0) ||
                    ('error' in data.data && data.data.error.length)
                ) {
                    renderRef.current = 'error';
                } else {
                    renderRef.current = 'success';
                }
            }
            extensionSdk.rendered(renderRef.current);
        }
    }, [data.data, renderRef.current]);

    if (data.isLoading) {
        return <Box p="large">Running Update...</Box>;
    } else {
        return (
            <Box p="large">
                <Button onClick={handleUpdate}>Update User Attributes</Button>
                <Paragraph color="error">{data.error}</Paragraph>
                <Paragraph color="success">
                    {data.data?.success
                        ? `Updated ${data.data.number_of_users} users`
                        : ''}
                </Paragraph>
                {data.data?.success &&
                    'erroring_users' in data.data &&
                    data.data.erroring_users &&
                    data.data.erroring_users?.length > 0 && (
                        <Paragraph color="error">
                            <List>
                                {data.data.erroring_users.map((user) => (
                                    <ListItem key={user.user_id}>
                                        {user.error}
                                    </ListItem>
                                ))}
                            </List>
                        </Paragraph>
                    )}
            </Box>
        );
    }
};

export default UserAttributeUpdater;
