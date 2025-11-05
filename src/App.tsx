// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * This is a sample Looker Extension written in typescript and React. It imports one component, <HelloWorld>.
 * HelloWorld makes a simple call to the Looker API using the Extension Framework's built in authentication,
 * and returns the logged in user.
 */
import { ExtensionProvider } from '@looker/extension-sdk-react';
import React, { Suspense, useEffect, useState } from 'react';

import { ComponentsProvider } from '@looker/components';
import { MountPoint } from '@looker/extension-sdk';
import { useBoolean } from 'usehooks-ts';
import { AppContextProvider } from './AppContext';
import useExtensionSdk from './hooks/useExtensionSdk';
import Main from './Main';
import { SettingsProvider } from './SettingsContext';
import UserAttributeUpdater from './UserAttributeUpdater';

export const App: React.FC = () => {
    const [route, setRoute] = useState('');
    const [routeState, setRouteState] = useState();

    const onRouteChange = (route: string, routeState?: any) => {
        setRoute(route);
        setRouteState(routeState);
    };

    return (
        <Suspense fallback={<></>}>
            <ExtensionProvider onRouteChange={onRouteChange} chattyTimeout={-1}>
                <HydrateModelConnections
                    route={route}
                    routeState={routeState}
                />
            </ExtensionProvider>
        </Suspense>
    );
};

const HydrateModelConnections = ({
    route,
    routeState,
}: {
    route: string;
    routeState: any;
}) => {
    const extensionSdk = useExtensionSdk();
    const is_visualization =
        extensionSdk.lookerHostData?.mountPoint ===
            MountPoint.dashboardVisualization ||
        extensionSdk.lookerHostData?.mountPoint === MountPoint.dashboardTile;
    const config = extensionSdk.getContextData();
    const loading = useBoolean(true);
    useEffect(() => {
        checkCache();
    }, []);

    const checkCache = async () => {
        if (!config?.use_cached_model_explore_connections) {
            // do nothing
        } else if (is_visualization) {
            // do nothing
        } else {
            if (
                config.cached_model_connection_data &&
                Object.keys(config.cached_model_connection_data.values).length >
                    0
            ) {
                console.info('setting model connection cache from config');
                await extensionSdk.localStorageSetItem(
                    'model_connections:0.0.2',
                    JSON.stringify(config.cached_model_connection_data)
                );
            }
        }
        loading.setFalse();
    };

    if (loading.value) {
        return <></>;
    } else if (is_visualization) {
        return (
            <AppContextProvider>
                <SettingsProvider>
                    <ComponentsProvider>
                        <UserAttributeUpdater />
                    </ComponentsProvider>
                </SettingsProvider>
            </AppContextProvider>
        );
    } else {
        return (
            <AppContextProvider>
                <SettingsProvider>
                    <Main route={route} routeState={routeState} />
                </SettingsProvider>
            </AppContextProvider>
        );
    }
};
