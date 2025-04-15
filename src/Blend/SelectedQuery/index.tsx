import { Flex } from "@looker/components";
import React from "react";
import { useBoolean } from "usehooks-ts";
// Import context
import { useBlendContext } from "../Context";
// Import Join component
import Join from "./Join";
// Import EmbedExplore component
import EmbedExplore from "./EmbedExplore";
// Import the IQueryJoin type definition if available (Optional)
// import { IQueryJoin } from '../types'; // Adjust path if you have types defined

const SelectedQuery = () => {
  // Get selectedQuery, queries, AND joins from the context
  // We still need 'joins' available for the child <Join> component to potentially use
  const { selectedQuery, queries, joins } = useBlendContext();
  const exploreLoading = useBoolean(true);

  // Safety Check: Handle the case where no query is selected
  if (!selectedQuery) {
    return null;
  }

  // --- Determine if the Join component should be rendered ---
  // --- REVERTED LOGIC: Render Join UI if the selected query is NOT the first one (index 0) ---
  // Find the index of the currently selected query in the main queries array.
  const selectedQueryIndex = queries.findIndex(q => q.uuid === selectedQuery.uuid);

  // Render the Join UI if the query exists in the array AND its index is greater than 0.
  const shouldRenderJoin = selectedQueryIndex > 0;
  // --- End REVERTED LOGIC ---


  return (
    <>
      {/* --- Render Join component CONDITIONALLY based on index --- */}
      {/* Only render if explore is not loading AND it's not the first query */}
      {!exploreLoading.value && shouldRenderJoin && (
        // Rendering <Join /> without props.
        // <Join/> MUST now internally handle the case where joins[selectedQuery.uuid] might be undefined
        // (specifically for the duplicated first query).
        <Join />
      )}
      {/* --- End Conditional Join Rendering --- */}

      <Flex height="100%" width="100%">
        <EmbedExplore
          key={selectedQuery.uuid}
          initial_query_id={selectedQuery.query_id}
          explore_id={selectedQuery.explore.id}
          uuid={selectedQuery.uuid}
          explore_label={selectedQuery.explore.label}
          doneLoading={exploreLoading.setFalse}
          startLoading={exploreLoading.setTrue}
        />
      </Flex>
    </>
  );
};

export default SelectedQuery;