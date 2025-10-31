import {
  List,
  Span,
  Spinner
} from "@looker/components";
import uniq from "lodash/uniq";
import React, { useCallback, useEffect } from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../../AppContext";
import { useBlendContext } from "../Context"; // Ensure path is correct
import QueryListItem from "./QueryListItem";


/**
 * QueryList Component
 *
 * Displays a list of queries with their associated fields and provides functionality for:
 * - Selecting queries
 * - Duplicating queries
 * - Deleting queries
 * - Displaying query fields with appropriate styling
 */
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

  /**
   * Initializes explore fields for all queries in the list
   * Fetches fields for each unique explore ID and handles loading states
   */
  const initialExploresFields = useCallback(async () => {
    if (!queries || queries.length === 0) {
      loading.setFalse();
      return;
    }

    const explores = uniq(
      queries
        .map((query) => query?.explore?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );

    if (explores.length === 0) {
      loading.setFalse();
      return;
    }

    const promises = explores.map((exploreId) => getExploreFields(exploreId));
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error("QueryList: Failed to initialize explore fields:", error);
    } finally {
      loading.setFalse();
    }
  }, [queries, getExploreFields, loading]);

  useEffect(() => {
    initialExploresFields();
  }, []);
  // --- End Initial Field Fetch ---

  /**
   * Handles query deletion with error handling
   */
  const handleDelete = useCallback(
    (uuid: string) => {
      console.log(`[QueryList] Initiating delete for query: ${uuid}`);
      try {
        deleteQuery(uuid);
      } catch (error) {
        console.error(
          `[QueryList] Error calling deleteQuery for ${uuid}:`,
          error
        );
      }
    },
    [deleteQuery]
  );
  // --- End Delete Handler ---

  /**
   * Handles query duplication process
   * 1. Gets source query information
   * 2. Creates a new query with copied fields
   * 3. Handles selection of the new query
   */
  const handleDuplicate = async (query: IQuery) => {
    const uuid = query.uuid;
    duplicating.setTrue();
    console.log(`[QueryList] Initiating duplicate for query: ${query.uuid}`);

    try {
      const duplicateInfo = duplicateQuery(uuid);

      if (duplicateInfo) {
        const fieldsToCopy = duplicateInfo.sourceQuery?.fields || [];
        console.log(
          `[QueryList] Got info: exploreId=${duplicateInfo.exploreId}, label=${duplicateInfo.label}. Calling newQuery with ${fieldsToCopy.length} initial fields...`
        );

        const newlyAddedQuery = await newQuery({
          explore_id: duplicateInfo.exploreId,
          explore_label: duplicateInfo.label,
          create_join: false,
          initialFields: fieldsToCopy,
          query_id: query.query_id,
        });

        if (newlyAddedQuery && newlyAddedQuery.uuid) {
          console.log(
            `[QueryList] newQuery completed successfully. New query UUID: ${newlyAddedQuery.uuid}.`
          );
        } else {
          console.error(
            `[QueryList] newQuery did not return a valid query object after duplication attempt.`
          );
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
    <List density={-2} width="100%" style={{ overflowY: "auto" }}>
      {
        queries.map((query, index) => {
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

          return <QueryListItem
            key={query.uuid}
            query={query}
            selected={isSelected}
            onClick={() => selectQuery(query)}
            handleDelete={handleDelete}
            handleDuplicate={handleDuplicate}
            loading={loading.value}
            index={index}
            duplicating={duplicating.value}
          />
        })
      }
    </List >
  );
  // --- End Component Return ---
};
