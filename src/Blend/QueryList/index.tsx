import { List, Span, Spinner } from '@looker/components';
import uniq from 'lodash/uniq';
import React, { useCallback, useEffect } from 'react';
import { useBoolean } from 'usehooks-ts';
import { useAppContext } from '../../AppContext';
import { useBlendContext } from '../Context'; // Ensure path is correct
import QueryListItem from './QueryListItem';

export const QueryList: React.FC = () => {
    const {
        queries,
        selectedQuery,
        selectQuery,
        deleteQuery,
        duplicateQuery,
        newQuery,
        resetAll,
    } = useBlendContext();

    const loading = useBoolean(true);
    const duplicating = useBoolean(false);
    const { getExploreFields } = useAppContext();

    const initialExploresFields = useCallback(async () => {
        if (!queries || queries.length === 0) {
            loading.setFalse();
            return;
        }

        const explores = uniq(
            queries
                .map((query) => query?.explore?.id)
                .filter(
                    (id): id is string =>
                        typeof id === 'string' && id.length > 0
                )
        );

        if (explores.length === 0) {
            loading.setFalse();
            return;
        }

        const promises = explores.map((exploreId) =>
            getExploreFields(exploreId)
        );
        try {
            await Promise.all(promises);
        } catch (error) {
            console.error(
                'QueryList: Failed to initialize explore fields:',
                error
            );
        } finally {
            loading.setFalse();
        }
    }, [queries, getExploreFields, loading]);

    useEffect(() => {
        initialExploresFields();
    }, []);

    /**
     * Handles query deletion with error handling
     */
    const handleDelete = (uuid: string, len_queries: number) => {
        try {
            if (len_queries === 1) {
                resetAll();
            } else {
                deleteQuery(uuid);
            }
        } catch (error) {
            console.error(
                `[QueryList] Error calling deleteQuery for ${uuid}:`,
                error
            );
        }
    };

    /**
     * Handles query duplication process
     * 1. Gets source query information
     * 2. Creates a new query with copied fields
     * 3. Handles selection of the new query
     */
    const handleDuplicate = async (query: IQuery) => {
        const uuid = query.uuid;
        duplicating.setTrue();

        try {
            const duplicateInfo = duplicateQuery(uuid);

            if (duplicateInfo) {
                const fieldsToCopy = duplicateInfo.sourceQuery?.fields || [];

                const newlyAddedQuery = await newQuery({
                    explore_id: duplicateInfo.exploreId,
                    explore_label: duplicateInfo.label,
                    create_join: false,
                    initialFields: fieldsToCopy,
                    query_id: query.query_id,
                });

                if (newlyAddedQuery && newlyAddedQuery.uuid) {
                } else {
                    console.error(
                        `[QueryList] newQuery did not return a valid query object after duplication attempt.`
                    );
                    selectQuery(duplicateInfo.sourceQuery);
                }
            } else {
                console.error(
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
                No queries added yet. Add an explore using the search above to
                begin blending.
            </Span>
        );
    }
    // --- End Loading / Empty State ---

    return (
        <List density={-2} width="100%" style={{ overflowY: 'auto' }}>
            {queries.map((query, index) => {
                // Basic check for valid query object before rendering
                if (!query || !query.uuid) {
                    console.warn(
                        'QueryList: Skipping render for invalid query object at index',
                        index,
                        query
                    );
                    return null; // Skip rendering this item
                }

                const isSelected = selectedQuery?.uuid === query.uuid;

                return (
                    <QueryListItem
                        key={query.uuid}
                        query={query}
                        selected={isSelected}
                        onClick={() => selectQuery(query)}
                        handleDelete={() =>
                            handleDelete(query.uuid, queries.length)
                        }
                        handleDuplicate={handleDuplicate}
                        loading={loading.value}
                        index={index}
                        duplicating={duplicating.value}
                    />
                );
            })}
        </List>
    );
};
