import { Box, Flex, Heading, Space } from "@looker/components";
import React from "react";
import LearnMoreInfoButton from "../components/Guide/LearnMoreInfoButton";
import { APP_NAME } from "../constants";
import { BlendButton } from "./BlendButton";
import { BlendContextProvider, useBlendContext } from "./Context";
import NewExplore from "./NewExplore";
import NoQueries from "./NoQueries";
import { QueryList } from "./QueryList";
import SelectedQuery from "./SelectedQuery";
interface BlendProps {}

const Blend: React.FC<BlendProps> = () => {
  const { queries, selectedQuery } = useBlendContext();

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
          <Flex justifyContent="space-between">
            <Heading as="h3" mb="medium">
              {APP_NAME}
            </Heading>
            <LearnMoreInfoButton />
          </Flex>
          <Box flexGrow={1} height="100%" overflow="auto">
            <QueryList />
            <Space />
            <NewExplore />
          </Box>
          <Space />
          <BlendButton />
        </Flex>
      )}

      {/* Main Content */}
      <Box flex={1} height="100%" position="relative">
        {queries.length === 0 && <NoQueries />}
        {queries.length > 0 && Boolean(selectedQuery?.uuid) && (
          <SelectedQuery />
        )}
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
