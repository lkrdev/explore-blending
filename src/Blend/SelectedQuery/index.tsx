import { Flex } from "@looker/components";
import React from "react";
import { useBoolean } from "usehooks-ts";
import { useBlendContext } from "../Context";
import EmbedExplore from "./EmbedExplore";
import Join from "./Join";

const SelectedQuery = () => {
  const { selectedQuery, queries } = useBlendContext();
  const exploreLoading = useBoolean(true);
  const show_join = queries.indexOf(selectedQuery!) > 0;

  return (
    <>
      {!exploreLoading.value && show_join && <Join />}
      <Flex height="100%" width="100%">
        <EmbedExplore
          key={selectedQuery!.uuid}
          initial_query_id={selectedQuery!.query_id}
          explore_id={selectedQuery!.explore.id}
          uuid={selectedQuery!.uuid}
          explore_label={selectedQuery!.explore.label}
          doneLoading={exploreLoading.setFalse}
          startLoading={exploreLoading.setTrue}
        />
      </Flex>
    </>
  );
};

export default SelectedQuery;
