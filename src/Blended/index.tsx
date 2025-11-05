import { Box, Heading, Space, SpaceVertical } from '@looker/components';
import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import LearnMoreInfoButton from '../components/Guide/LearnMoreInfoButton';
import { APP_NAME } from '../constants';
import { useSettings } from '../SettingsContext';
import { BlendedContextProvider } from './Context';
import EmbedExplore from './EmbedExplore';
import SidebarItems from './SidebarItems';

const Blended: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { config } = useSettings();
    if (!slug) {
        return <Redirect to="/blend" />;
    } else {
        return (
            <Space height="100%" width="100%" overflow="hidden">
                {/* Sidebar */}
                <SpaceVertical
                    width={300}
                    height="100%"
                    p="large"
                    style={{ borderRight: '1px solid #e1e1e1' }}
                >
                    <Space between width="100%">
                        <Heading as="h3" mb="medium">
                            {config?.use_extension_label
                                ? window.lookerExtensionMetadata.label
                                : APP_NAME}
                        </Heading>
                        <LearnMoreInfoButton />
                    </Space>
                    <Space width="100%" overflow="auto">
                        <SidebarItems />
                    </Space>

                    <Box flexGrow={1} minHeight="0" />
                </SpaceVertical>

                {/* Main Content */}
                <Box flex={1} height="100%" position="relative">
                    <EmbedExplore
                        explore_id={`sql__${slug}::sql_runner_query`}
                    />
                </Box>
            </Space>
        );
    }
};

const BlendedBase: React.FC = () => {
    return (
        <BlendedContextProvider>
            <Blended />
        </BlendedContextProvider>
    );
};

export default BlendedBase;
