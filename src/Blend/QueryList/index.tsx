import {
  Box,
  Flex,
  Icon,
  IconButton,
  List,
  ListItem,
  Span,
  Spinner,
  Tooltip,
} from "@looker/components";
import { CopyAll, Delete } from "@styled-icons/material";
import uniq from "lodash/uniq";
import React, { useCallback, useEffect } from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../../AppContext";
// Assuming IQuery type is imported or defined globally/elsewhere
import { useBlendContext } from "../Context"; // Ensure path is correct

export const QueryList: React.FC = () => {
  // --- Get all necessary functions and state from context ---
  const {
    queries,
    selectedQuery,
    selectQuery, // Accepts IQuery | null
    deleteQuery,
    duplicateQuery, // Returns { exploreId, label, sourceQuery } | null
    newQuery, // Returns Promise<IQuery | null>
  } = useBlendContext();

  const loading = useBoolean(true); // For initial field loading
  const duplicating = useBoolean(false); // For initial field loading
  const { getExploreFields, getExploreField } = useAppContext(); // For field display

  // --- Logic to fetch initial fields for all queries ---
  const initialExploresFields = useCallback(async () => {
    // Guard against no queries
    if (!queries || queries.length === 0) {
      loading.setFalse();
      return;
    }
    // Get unique explore IDs safely
    const explores = uniq(
      queries
        .map((query) => query?.explore?.id) // Safely access explore and id
        .filter((id): id is string => typeof id === "string" && id.length > 0) // Ensure it's a valid string
    );
    // Guard against no valid explores found
    if (explores.length === 0) {
      loading.setFalse();
      return;
    }
    // Fetch fields for all unique explores
    const promises = explores.map((exploreId) => getExploreFields(exploreId));
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("QueryList: Failed to initialize explore fields:", error);
    } finally {
      loading.setFalse(); // Ensure loading is set to false even on error
    }
  }, [queries, getExploreFields, loading]); // Dependencies

  useEffect(() => {
    initialExploresFields();
  }, []);
  // --- End Initial Field Fetch ---

  // --- Delete Handler ---
  const handleDelete = useCallback(
    (uuid: string) => {
      // Optional: Add confirmation dialog here
      // if (!window.confirm('Are you sure?')) return;
      console.log(`[QueryList] Initiating delete for query: ${uuid}`);
      try {
        deleteQuery(uuid);
      } catch (error) {
        console.error(
          `[QueryList] Error calling deleteQuery for ${uuid}:`,
          error
        );
        // Add user feedback? (e.g., toast notification)
      }
    },
    [deleteQuery]
  );
  // --- End Delete Handler ---

  // --- HandleDuplicate function ---
  const handleDuplicate = async (query: IQuery) => {
    const uuid = query.uuid;
    duplicating.setTrue();
    console.log(`[QueryList] Initiating duplicate for query: ${query.uuid}`);

    try {
      console.log(
        `[QueryList] Getting info for duplication from context function for ${uuid}...`
      );
      // --- Step 1: Get source info ---
      const duplicateInfo = duplicateQuery(uuid); // Gets { exploreId, label, sourceQuery } | null

      if (duplicateInfo) {
        const fieldsToCopy = duplicateInfo.sourceQuery?.fields || [];
        console.log(
          `[QueryList] Got info: exploreId=<span class="math-inline">\{duplicateInfo\.exploreId\}, label\=</span>{duplicateInfo.label}. Calling newQuery with ${fieldsToCopy.length} initial fields...`
        );

        // --- Step 2: Call newQuery ONCE, passing initial fields ---
        const newlyAddedQuery = await newQuery(
          duplicateInfo.exploreId,
          duplicateInfo.label,
          false, // create_join = false
          fieldsToCopy, // Pass the fields to copy
          query.query_id // Pass the query_id
        );

        if (newlyAddedQuery && newlyAddedQuery.uuid) {
          console.log(
            `[QueryList] newQuery completed successfully. New query UUID: ${newlyAddedQuery.uuid}.`
          );
          // Selection should have been handled by newQuery. No second step needed.
        } else {
          console.error(
            `[QueryList] newQuery did not return a valid query object after duplication attempt.`
          );
          // Fallback: Reselect original query if possible
          selectQuery(duplicateInfo.sourceQuery);
        }
      } else {
        console.warn(
          `[QueryList] duplicateQuery could not find source info for UUID: ${uuid}`
        );
      }
    } catch (error) {
      console.error(
        `[QueryList] Error during simplified duplication process for original UUID ${uuid}:`,
        error
      );
      const originalQuery = queries.find((q) => q.uuid === uuid);
      if (originalQuery) selectQuery(originalQuery);
    } finally {
      console.log(
        `[QueryList] Finished duplication attempt for query: ${uuid}`
      );
    }
    duplicating.setFalse();
    // Update dependencies - remove updateQueryFields if no longer needed elsewhere
  };
  // --- End handleDuplicate modification ---

  // --- Loading / Empty State ---
  if (loading.value) {
    return <Spinner />;
  }
  if (!queries || queries.length === 0) {
    // Provide helpful message if no queries exist
    return (
      <Span p="medium">
        No queries added yet. Add an explore using the search above to begin
        blending.
      </Span>
    );
  }
  // --- End Loading / Empty State ---

  // --- Component Return JSX ---
  return (
    <List density={-2}>
      {queries.map((query, index) => {
        // Basic check for valid query object before rendering
        if (!query || !query.uuid) {
          console.warn(
            "QueryList: Skipping render for invalid query object at index",
            index,
            query
          );
          return null; // Skip rendering this item
        }

        const isSelected = selectedQuery?.uuid === query.uuid;

        return (
          // List Item for each Query
          <ListItem
            key={query.uuid} // Use guaranteed unique UUID
            selected={isSelected}
            // Select query on click (pass the full object)
            onClick={() => {
              if (duplicating.value) return; // Prevent action during duplication
              selectQuery(query); // Pass the object
            }}
            itemRole="listitem" // Accessibility
            style={{
              cursor: duplicating.value ? "default" : "pointer", // Indicate clickability
              userSelect: "none", // Prevent text selection on click
              // Add visual feedback for selection if needed (border, background)
              // backgroundColor: isSelected ? 'lightblue' : 'transparent',
            }}
          >
            {/* Flex container for label and icons */}
            <Flex
              alignItems="center"
              justifyContent="space-between"
              width="100%"
            >
              {/* Query Label */}
              <Span
                style={{ fontWeight: isSelected ? "bold" : "normal" }}
                // Add tooltip for long labels if necessary
                // title={query.explore?.label || `Query ${index + 1}`}
              >
                {query.explore?.label || `Query ${index + 1}`}{" "}
                {` (${query.uuid})`}
              </Span>

              {/* Action Icons Wrapper */}
              <Box>
                {/* Duplicate Button */}
                <Tooltip content="Duplicate this query">
                  <IconButton
                    // Show spinner when this item is duplicating
                    icon={
                      duplicating.value ? (
                        <Spinner size={16} />
                      ) : (
                        <Icon size="medium" icon={<CopyAll size={24} />} />
                      )
                    }
                    label="Duplicate Query"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation(); // Prevent ListItem onClick trigger
                      handleDuplicate(query); // Call updated handler
                    }}
                    // Disable if this specific item or any item is duplicating
                    disabled={duplicating.value}
                    size="small"
                  />
                </Tooltip>

                {/* Delete Button */}

                <IconButton
                  icon={<Delete />}
                  label={`Delete Query ${query.explore?.label || index + 1}`}
                  size="small"
                  // Hide delete button if only one query exists
                  style={{
                    visibility: queries.length > 1 ? "visible" : "hidden",
                  }}
                  // Disable during any duplication process
                  disabled={duplicating.value}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation(); // Prevent ListItem onClick trigger
                    handleDelete(query.uuid);
                  }}
                />
              </Box>
              {/* End Action Icons Wrapper */}
            </Flex>
            {/* End Flex container */}

            {/* Nested list for fields - Always Show if Not Duplicating */}
            {!duplicating.value && (
              <List density={-3}>
                {" "}
                {/* Add some margin if needed */}
                {/* Check if fields exist and is an array */}
                {
                  query.fields && Array.isArray(query.fields)
                    ? query.fields.map((field) => {
                        // Basic check for valid field object
                        if (!field || !field.id) return null;
                        // Get field metadata safely
                        const field_metadata = query.explore?.id
                          ? getExploreField(query.explore.id, field.id)
                          : null;
                        // Determine color based on type
                        const itemColor =
                          field_metadata?.type === "measure"
                            ? "positive"
                            : field_metadata?.type === "dimension"
                            ? "key"
                            : "text3";
                        return (
                          <ListItem
                            // Ensure key is unique and stable
                            key={`${query.uuid}-${field.id}`}
                            itemRole="none" // Semantically not list items if not interactive
                            style={{ pointerEvents: "none" }} // Not interactive
                            color={itemColor}
                            fontSize="small"
                            // Add title for potential tooltip on hover showing field id
                            title={field.id}
                          >
                            {/* Display label or fallback to ID */}
                            {field_metadata?.label || field.id}
                          </ListItem>
                        );
                      })
                    : // Optional: Render something if fields array is empty or missing
                      // <ListItem fontSize="small" color="text1">No fields selected</ListItem>
                      null // Or render nothing
                }
              </List>
            )}
            {/* End Nested list for fields */}
          </ListItem>
          // End List Item
        );
      })}
    </List>
  );
  // --- End Component Return ---
};

// Define Interfaces locally only if they are not properly imported/available globally
// interface IQuery { /* ... */ }
