import { Flex } from "@looker/components";
import React from "react";
import { useBlendContext } from "../Context";
import EmbedExplore from "./EmbedExplore";

const SelectedQuery = () => {
  const { selectedQuery, queries } = useBlendContext();

  return (
    <Flex height="100%" width="100%">
      <EmbedExplore
        key={selectedQuery!.uuid}
        initial_query_id={selectedQuery!.query_id}
        explore_id={selectedQuery!.explore.id}
        uuid={selectedQuery!.uuid}
        explore_label={selectedQuery!.explore.label}
      />
    </Flex>
  );
};

export default SelectedQuery;
