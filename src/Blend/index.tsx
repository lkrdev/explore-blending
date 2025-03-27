import { Box, Flex, Heading, Space } from "@looker/components";
import React from "react";
import { BlendButton } from "./BlendButton";
import { BlendContextProvider, useBlendContext } from "./Context";
import NoQueries from "./NoQueries";
import { QueryList } from "./QueryList";
import SelectedQuery from "./SelectedQuery";

interface BlendProps {}

const Blend: React.FC<BlendProps> = () => {
  const { queries } = useBlendContext();

  return (
    <Flex height="100%" width="100%" overflow="hidden">
      {/* Sidebar */}
      {queries.length > 0 && (
        <Flex
          width={300}
          p="large"
          style={{ borderRight: "1px solid #e1e1e1" }}
          flexDirection="column"
        >
          <Heading as="h3" mb="medium">
            Explore Blending
          </Heading>
          <Box flexGrow={1} height="100%" overflow="auto">
            <QueryList />
          </Box>
          <Space />
          <BlendButton />
        </Flex>
      )}

      {/* Main Content */}
      <Box flex={1} p="large" height="100%">
        {queries.length === 0 && <NoQueries />}
        {queries.length > 1 && <SelectedQuery />}
      </Box>
    </Flex>
  );
};

const BlendBase: React.FC = () => {
  return (
    <BlendContextProvider>
      <Blend />
    </BlendContextProvider>
  );
};

export default BlendBase;
