// --- Join.tsx (Reverted to version BEFORE useEffect fetching, but WITH default JoinRow render) ---

import {
  Box,
  FieldSelect,
  SelectOptionGroupProps,
  SelectOptionObject,
  // Removed Spinner
} from "@looker/components";
import React, { useMemo } from "react"; // Removed useEffect, useState
import { useAppContext } from "../../AppContext";
import { useBlendContext } from "../Context";
import JoinRow from "./JoinRow"; // Ensure this path is correct
// Import types if available
// import { IQueryJoin, IJoin, TJoinType, IQuery } from '../types';

const Join = () => {
  const { getExploreField } = useAppContext();
  // Removed unused updateJoinType import for this version if it wasn't used directly here before
  const { selectedQuery, queries, joins, updateJoinType } = useBlendContext();

  // --- Safe Data Access ---
  if (!selectedQuery) {
    return null;
  }
  // Safely get join data, provide fallback structure if needed for type safety downstream
  const currentJoinData: IQueryJoin | undefined = joins[selectedQuery.uuid];
  // Use type from data or default
  const currentJoinType: TJoinType = currentJoinData?.type || 'inner';
  // Use joins array from data, default to empty array
  const actualJoinsArray: IJoin[] = currentJoinData?.joins || [];
  // --- End Safe Data Access ---


  // --- useMemo for fields (Original structure + safety checks) ---
  // This calls getExploreField directly - potential timeout risk remains
  const { to_fields, from_fields } = useMemo(() => {
    let to_fields_calc: SelectOptionObject[] = [];
    let from_fields_calc: SelectOptionGroupProps[] = [];
    if (!selectedQuery) return { to_fields: [], from_fields: []};
    queries.forEach((query) => {
      const exploreId = query.explore?.id;
      if (!exploreId) return;
      (query.fields || []).forEach((field) => {
        const found_field = getExploreField(exploreId, field.id); // Direct call
        const in_current_query = query.uuid === selectedQuery.uuid;
        if (found_field) {
          if (in_current_query) { to_fields_calc.push({ label: found_field.label || field.id, value: field.id }); }
          else {
            const groupLabel = `${query.explore?.label || 'Query'} (${query.uuid})`;
            const current_group = from_fields_calc.find(g => g.label === groupLabel);
            const new_option = { label: found_field.label || field.id, value: [query.uuid, field.id].join("::") };
            if (!current_group) { from_fields_calc.push({ label: groupLabel, options: [new_option] }); }
            else { if (!current_group.options) current_group.options = []; current_group.options.push(new_option); }
          }
        }
        // Removed console warn about cache miss as there's no explicit pre-fetch now
      });
    });
    // Sorting logic
    from_fields_calc = from_fields_calc.map((group) => ({ ...group, options: (group.options || []).sort((a, b) => String(a.label).localeCompare(String(b.label))) }));
    return {
      to_fields: to_fields_calc.sort((a, b) => String(a.label).localeCompare(String(b.label))),
      from_fields: from_fields_calc.sort((a, b) => String(a.label).localeCompare(String(b.label))),
    };
    // Dependencies trigger recalculation, potentially causing repeated getExploreField calls
  }, [selectedQuery, queries, getExploreField]);
  // --- End useMemo ---


  // --- Rendering ---
  // Removed loading/error state rendering

  return (
    <>
      <Box /* Container Box - Reverted to simpler structure perhaps */
        display="flex"
        position="absolute"
        top="0px"
        left="0px"
        style={{ gap: "4px" }}
        width="65%"
        height="84px" // Original fixed height
        zIndex={1}
        // Removed potentially added styling like padding/border/background
      >
        <FieldSelect /* Join Type Selector */
            width="90px" label="Join Type"
            options={[ /* Original Options */ { label: "Inner", value: "inner" }, { label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Full", value: "full" }, { label: "Cross", value: "cross" } ]}
            value={currentJoinType}
            onChange={(value: string) => { if (selectedQuery) updateJoinType(selectedQuery.uuid, value as TJoinType); }}
         />
        <Box /* Join Rows Container */ flexGrow={1} display="flex" flexDirection="column" style={{ gap: "4px" }}>
           {/* Conditional Rendering: Default JoinRow if array is empty */}
          {actualJoinsArray.length > 0 ? (
            actualJoinsArray.map((j, index) => (
              <JoinRow
                key={j.uuid}
                join={j}
                index={index}
                is_last={index === actualJoinsArray.length - 1}
                query={selectedQuery} // Assumes selectedQuery is not null here
                to_fields={to_fields} // Pass potentially empty fields if timeout occurred
                from_fields={from_fields} // Pass potentially empty fields if timeout occurred
                join_type={currentJoinType}
                join_length={actualJoinsArray.length}
              />
            ))
          ) : (
            // Render the default row when actualJoinsArray is empty
            <JoinRow
              key={`${selectedQuery.uuid}-default-join`}
              join={{ uuid: `${selectedQuery.uuid}-default`, from_query_id: "", to_query_id: selectedQuery.uuid, from_field: "", to_field: "" }}
              index={0}
              is_last={true}
              query={selectedQuery} // Assumes selectedQuery is not null here
              to_fields={to_fields} // Pass potentially empty fields
              from_fields={from_fields} // Pass potentially empty fields
              join_type={currentJoinType}
              join_length={1}
            />
          )}
        </Box>
      </Box>
      {/* Spacer Box - Original calculation logic */}
      <Box height={Math.max(0, (actualJoinsArray.length > 0 ? actualJoinsArray.length : 1) * 36 - 24)} />
    </>
  );
};

export default Join;