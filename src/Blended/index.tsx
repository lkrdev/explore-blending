import { Box, Flex, Heading, Space } from "@looker/components";
import React from "react";
import { Redirect, useParams } from "react-router-dom";
import { APP_NAME } from "../constants";
import { BlendedContextProvider } from "./Context";
import EmbedExplore from "./EmbedExplore";
import SidebarItems from "./SidebarItems";

const Blended: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) {
    // @ts-ignore
    return <Redirect to="/blend" />;
  } else {
    return (
      <Flex height="100%" width="100%" overflow="hidden">
        {/* Sidebar */}
        <Flex
          width={300}
          p="large"
          style={{ borderRight: "1px solid #e1e1e1" }}
          flexDirection="column"
        >
          <Heading as="h3" mb="medium">
            {APP_NAME}
          </Heading>
          <Box flexGrow={1} height="100%" overflow="auto">
            <SidebarItems />
          </Box>
          <Space />
          {/* <BlendButton /> */}
        </Flex>

        {/* Main Content */}
        <Box flex={1} height="100%" position="relative">
          <EmbedExplore explore_id={`sql__${slug}::sql_runner_query`} />
        </Box>
      </Flex>
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
