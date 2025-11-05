import { ILookerConnection } from '@looker/embed-sdk';
import { findIndex, mergeWith } from 'lodash';
import uniqueId from 'lodash/uniqueId';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'; // Added useMemo & ensure useCallback is imported
import { useAppContext } from '../AppContext';
import { useSearchParams } from '../hooks/useSearchParams';
// Example - adjust path and type name based on your SDK setup
//import { IQuery as LookerQuery } from "@looker/sdk";

// Assuming IQuery, IJoin, TJoinType, IQueryJoin, IBlendData, ITranslatedJoin types are defined elsewhere correctly

// --- Interface Definition ---
interface IBlendContext {
    queries: IQuery[];
    setQueries: (queries: IQuery[]) => void; // Exposing setter - use with caution
    selectedQuery: IQuery | null;
    selectQuery: (queryToSelect: IQuery | null) => void; // Accepts object
    joins: { [key: string]: IQueryJoin };
    updateJoin: (join: IJoin, type: TJoinType) => void;
    updateJoinType: (to_query_id: string, type: TJoinType) => void;
    newJoin: (
        from_query_id: string,
        to_query_id: string,
        from_field: string,
        to_field: string,
        type: TJoinType
    ) => void;
    // *** newQuery now returns the created query object or null ***
    newQuery: (newQuery: INewQuery) => Promise<IQuery | null>;
    deleteQuery: (uuid: string) => void;
    updateQuery: (query: IQuery) => void;
    // *** duplicateQuery returns info needed to call newQuery ***
    duplicateQuery: (
        sourceUuid: string
    ) => { exploreId: string; label: string; sourceQuery: IQuery } | null;
    deleteJoin: (to_query_id: string, join_uuid: string) => void;
    // *** Added function to update only fields ***
    resetAll: () => void;
    connection?: string; // Keep if used
    validateJoin: (join: IJoin) => boolean;
    validateJoins: () => IQueryJoin[];
    first_query_connection?: string; // Keep if used
    embed_connection: ILookerConnection | null;
    setEmbedConnection: React.Dispatch<
        React.SetStateAction<ILookerConnection | null>
    >;
}
// --- End Interface ---

export const BlendContext = createContext<IBlendContext | undefined>(undefined);

export const useBlendContext = () => {
    const context = useContext(BlendContext);
    if (!context) {
        throw new Error(
            'useBlendContext must be used within a BlendContextProvider'
        );
    }
    return context;
};

// Assuming IBlendData and ITranslatedJoin types are defined correctly elsewhere
const setBlendData = (blend_data: IBlendData): string | undefined => {
    // Return undefined if there are no queries and no joins
    if (
        (!blend_data.queries || blend_data.queries.length === 0) &&
        (!blend_data.joins || Object.keys(blend_data.joins).length === 0)
    ) {
        //console.log("[setBlendData] No queries or joins, returning undefined.");
        return undefined;
    }

    const dataToEncode: IBlendQueryInput = blend_data.queries.reduce(
        (acc: IBlendQueryOutput, _v, k) => {
            const query = blend_data.queries[k];
            const found_query_join =
                blend_data.joins && blend_data.joins[query.uuid]
                    ? blend_data.joins[query.uuid]
                    : undefined;
            if (
                found_query_join &&
                found_query_join.joins?.length &&
                query.fields?.length &&
                query.query_id
            ) {
                if (query.explore.new_label?.length) {
                    acc.new_explore_labels.push(query.explore.new_label);
                    acc.nel_i.push(k);
                }
                if (query.alias?.length) {
                    acc.aliases.push(query.alias);
                    acc.a_i.push(k);
                }
                if (query.respect_limit === true) {
                    acc.l_i.push(k);
                }
                acc.queries.push(query.query_id);
                acc.query_uuids.push(query.uuid);

                acc.joins.push({
                    type: found_query_join.type,
                    joins: found_query_join.joins.map((j) => {
                        const from_query_index = blend_data.queries.findIndex(
                            (q) => q.uuid === j.from_query_id
                        );
                        return {
                            from_query_index: from_query_index,
                            from_field: j.from_field,
                            to_field: j.to_field,
                        };
                    }),
                });
            }
            return acc;
        },
        {
            new_explore_labels: [],
            nel_i: [],
            aliases: [],
            a_i: [],
            l_i: [],
            joins: [],
            query_uuids: [],
            queries: [],
        } as IBlendQueryOutput
    );
    try {
        // Encode the JSON string to Base64
        const encodedData = btoa(JSON.stringify(dataToEncode));
        //console.log("[setBlendData] Encoded data successfully.");
        return encodedData;
    } catch (error) {
        console.error(
            '[setBlendData] Error encoding data to Base64:',
            error,
            'Data:',
            dataToEncode
        );
        return undefined; // Return undefined on error
    }
};

export const BlendContextProvider = ({
    blend_data,
    children,
}: {
    blend_data?: IBlendData;
    children: React.ReactNode;
}) => {
    // --- State Definitions ---
    const [queries, setQueries] = useState<IQuery[]>(blend_data?.queries || []);
    const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(
        // Select first query initially if available, otherwise null
        blend_data?.queries && blend_data.queries.length > 0
            ? blend_data.queries[0]
            : null
    );
    const [joins, setJoins] = useState<{ [key: string]: IQueryJoin }>(
        blend_data?.joins || {}
    );
    const [embed_connection, setEmbedConnection] =
        useState<ILookerConnection | null>(null);
    const { setSearchParams } = useSearchParams();
    const { getExploreFields, model_connections, getModelConnection } =
        useAppContext();
    // --- End State Definitions ---

    // --- Effect to update Search Params ---
    useEffect(() => {
        setSearchParams({
            b: setBlendData({ queries, joins }),
        });
    }, [queries, joins]);
    // --- End Effect setSearchParams ---

    // --- Core Functions ---

    // --- Keep join functions (updateJoinType, updateJoin, newJoin, deleteJoin) as originally provided, add useCallback ---
    const updateJoinType = useCallback(
        (to_query_id: string, type: TJoinType) => {
            setJoins((prevJoins) => {
                const existingEntry = prevJoins[to_query_id];
                const newEntry: IQueryJoin = {
                    to_query_id: to_query_id, // Ensure key is present
                    joins: existingEntry?.joins || [], // Default to empty array if needed
                    type: type, // Update type
                };
                return { ...prevJoins, [to_query_id]: newEntry };
            });
        },
        [setJoins]
    ); // Added dependency

    const updateJoin = useCallback(
        (join: IJoin, type: TJoinType) => {
            setJoins((prevJoins) => {
                const current_join_entry = prevJoins[join.to_query_id];
                if (!current_join_entry) {
                    const newJoinEntry: IQueryJoin = {
                        to_query_id: join.to_query_id,
                        joins: [{ ...join, uuid: join.uuid || uniqueId('k') }],
                        type: type,
                    };
                    return { ...prevJoins, [join.to_query_id]: newJoinEntry };
                } else {
                    const joinIndex = current_join_entry.joins.findIndex(
                        (j) => j.uuid === join.uuid
                    );
                    let updatedInnerJoins: IJoin[];
                    if (joinIndex > -1) {
                        updatedInnerJoins = current_join_entry.joins.map(
                            (j, index) =>
                                index === joinIndex
                                    ? { ...join, uuid: j.uuid }
                                    : j
                        );
                    } else {
                        updatedInnerJoins = [
                            ...current_join_entry.joins,
                            { ...join, uuid: join.uuid || uniqueId('k') },
                        ];
                    }
                    return {
                        ...prevJoins,
                        [join.to_query_id]: {
                            ...current_join_entry,
                            joins: updatedInnerJoins,
                        },
                    };
                }
            });
        },
        [setJoins]
    ); // Added dependency

    const deleteJoin = useCallback(
        (to_query_id: string, join_uuid: string) => {
            setJoins((p) => {
                const newJoins = { ...p };
                if (newJoins[to_query_id]?.joins) {
                    // Check join array exists
                    newJoins[to_query_id].joins = newJoins[
                        to_query_id
                    ].joins.filter((j) => j.uuid !== join_uuid);
                    // Optionally remove entry if joins array is empty
                    // if (newJoins[to_query_id].joins.length === 0) delete newJoins[to_query_id];
                }
                return newJoins;
            });
        },
        [setJoins]
    ); // Added dependency

    // --- Place newJoin definition BEFORE newQuery ---

    const newJoin = useCallback(
        (
            from_query_id: string,
            to_query_id: string,
            from_field: string,
            to_field: string,
            type: TJoinType
        ) => {
            setJoins((prevJoins) => {
                // Ensure the target query exists or create a default structure
                const targetQueryId = to_query_id || ''; // Handle cases where to_query_id might be empty initially
                if (!targetQueryId) {
                    console.warn(
                        '[BlendContext:newJoin] Attempted to create join with empty to_query_id.'
                    );
                    return prevJoins; // Avoid creating join with no target
                }

                const newJoinObject: IJoin = {
                    uuid: uniqueId('k'), // Generate UUID for the specific join condition
                    from_query_id,
                    to_query_id: targetQueryId, // Use potentially corrected target ID
                    from_field,
                    to_field,
                };

                const existingEntry = prevJoins[targetQueryId];

                if (existingEntry) {
                    // Add the new join condition to the existing entry's joins array
                    console.log(
                        `[BlendContext:newJoin] Adding join condition to existing entry for ${targetQueryId}`
                    );
                    return {
                        ...prevJoins,
                        [targetQueryId]: {
                            ...existingEntry,
                            joins: [
                                ...(existingEntry.joins || []),
                                newJoinObject,
                            ], // Ensure joins array exists
                            // Keep existing type unless explicitly updating
                        },
                    };
                } else {
                    // Create a new entry for the to_query_id
                    console.log(
                        `[BlendContext:newJoin] Creating new join entry for ${targetQueryId}`
                    );
                    const newQueryJoinEntry: IQueryJoin = {
                        to_query_id: targetQueryId,
                        joins: [newJoinObject], // Start with the new join condition
                        type, // Use the provided type for the new entry
                    };
                    return { ...prevJoins, [targetQueryId]: newQueryJoinEntry };
                }
            });
        },
        [setJoins]
    ); // Dependency

    // --- Replace the existing newQuery function in BlendContext.tsx with this ---
    const newQuery = useCallback(
        async ({
            explore_id,
            explore_label,
            create_join = false,
            initialFields,
            query_id,
        }: INewQuery): Promise<IQuery | null> => {
            let uuid = uniqueId('q');
            while (queries.find((q) => q.uuid === uuid)) {
                uuid = uniqueId('q');
            }

            const fieldsToUse = initialFields || []; // Use initialFields if provided, else empty array
            console.log(
                `[BlendContext:newQuery] Creating new query (UUID: ${uuid}) for explore: ${explore_id}. Initial field count: ${fieldsToUse.length}`
            );

            const newQueryObject: IQuery = {
                uuid,
                query_id: query_id || '',
                explore: { id: explore_id, label: explore_label },
                fields: fieldsToUse, // <-- Use fieldsToUse here
            };

            try {
                console.log(
                    `[BlendContext:newQuery] Calling getExploreFields for ${explore_id}...`
                );
                await getExploreFields(explore_id); // Still call this - may be needed for Looker setup, hopefully cached.
                console.log(
                    `[BlendContext:newQuery] getExploreFields completed for ${explore_id}.`
                );

                // Add the new query (now potentially with fields) to state
                setQueries((p) => [...p, newQueryObject]);

                // Handle join creation if needed
                const firstQueryUuid =
                    queries.length > 0 ? queries[0]?.uuid : undefined;
                if (create_join && firstQueryUuid) {
                    newJoin(firstQueryUuid, uuid, '', '', 'inner');
                } else {
                    newJoin('', uuid, '', '', 'inner'); // Ensure default join structure
                }

                // Select the newly created query
                setSelectedQuery(newQueryObject);
                console.log(
                    `[BlendContext:newQuery] Added and selected new query ${uuid}. Returning object.`
                );
                return newQueryObject; // Return the object
            } catch (error) {
                console.error(
                    `[BlendContext:newQuery] Error during new query creation for explore ${explore_id}:`,
                    error
                );
                return null;
            }
            // Update dependencies as needed
        },
        [getExploreFields, queries, setQueries, setSelectedQuery, newJoin]
    );
    // --- End newQuery modification ---

    // *** UPDATED: duplicateQuery only returns info ***
    const duplicateQuery = (
        sourceUuid: string
    ): { exploreId: string; label: string; sourceQuery: IQuery } | null => {
        console.log(
            `[BlendContext:duplicateQuery] Finding source query: ${sourceUuid}`
        );
        const sourceQuery = queries.find((q) => q.uuid === sourceUuid);

        if (!sourceQuery || !sourceQuery.explore?.id) {
            console.error(
                '[BlendContext:duplicateQuery] Source query or its explore ID not found:',
                sourceUuid
            );
            return null;
        }

        const exploreId = sourceQuery.explore.id;
        const newLabel = `${sourceQuery.explore.label || 'Query'} (Copy)`;
        console.log(
            `[BlendContext:duplicateQuery] Found source, returning info: exploreId=${exploreId}, label=${newLabel}`
        );

        // Return info needed to create a new query based on this one
        return {
            exploreId: exploreId,
            label: newLabel,
            sourceQuery: sourceQuery, // Pass source for fields access later
        };
    }; // Only depends on queries

    // *** Ensure selectQuery accepts object ***
    const selectQuery = (new_query: IQuery | null) => {
        setSelectedQuery((prev) => {
            if (!prev) {
                return new_query;
            } else if (!new_query) {
                return prev;
            } else if (prev.uuid === new_query.uuid) {
                return prev;
            } else {
                return new_query;
            }
        });
    };

    const updateQuery = (query: IQuery) => {
        setQueries((prev) => {
            const new_queries = [...prev];
            const found = findIndex(new_queries, { uuid: query.uuid });
            if (found > -1) {
                mergeWith(
                    new_queries[found],
                    query,
                    (object_value, source_value) => {
                        if (Array.isArray(object_value)) {
                            return source_value;
                        }
                    }
                );
            } else {
                new_queries.push(query);
            }
            return new_queries;
        });
    };

    const resetAll = () => {
        setQueries([]);
        setJoins({});
        setSelectedQuery(null);
        embed_connection?.preload();
    };

    // --- Keep deleteQuery as updated previously (with field resets) ---
    const deleteQuery = useCallback(
        (uuidToDelete: string) => {
            let originalQueries: IQuery[] = [];
            let updatedQueries: IQuery[] = [];

            setQueries((prevQueries) => {
                originalQueries = prevQueries;
                updatedQueries = prevQueries.filter(
                    (q) => q.uuid !== uuidToDelete
                );
                console.log(
                    `[BlendContext:deleteQuery] Removing query ${uuidToDelete}. Queries remaining: ${updatedQueries.length}`
                );
                return updatedQueries;
            });

            setJoins((prevJoins) => {
                const newJoinsState = { ...prevJoins };
                if (newJoinsState[uuidToDelete]) {
                    console.log(
                        `[BlendContext:deleteQuery] Removing joins entry for deleted query: ${uuidToDelete}`
                    );
                    delete newJoinsState[uuidToDelete];
                }
                console.log(
                    `[BlendContext:deleteQuery] Checking remaining joins for references to ${uuidToDelete}...`
                );
                for (const toQueryId in newJoinsState) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            newJoinsState,
                            toQueryId
                        )
                    ) {
                        const queryJoinEntry = newJoinsState[toQueryId];
                        let joinsModified = false;
                        const updatedInnerJoins = queryJoinEntry.joins.map(
                            (innerJoin) => {
                                let modifiedJoin = { ...innerJoin };
                                if (
                                    modifiedJoin.from_query_id === uuidToDelete
                                ) {
                                    if (modifiedJoin.from_field) {
                                        console.log(
                                            `[BlendContext:deleteQuery] Resetting from_field ('${modifiedJoin.from_field}') in join ${modifiedJoin.uuid} (to ${toQueryId}) because from_query ${uuidToDelete} was deleted.`
                                        );
                                        modifiedJoin.from_field = '';
                                        joinsModified = true;
                                    }
                                }
                                // Add optional check for to_query_id here if needed
                                return modifiedJoin;
                            }
                        );
                        if (joinsModified) {
                            console.log(
                                `[BlendContext:deleteQuery] Updating joins entry for ${toQueryId} due to field resets.`
                            );
                            newJoinsState[toQueryId] = {
                                ...queryJoinEntry,
                                joins: updatedInnerJoins,
                            };
                        }
                    }
                }
                console.log(
                    `[BlendContext:deleteQuery] Finished cleaning join references.`
                );
                return newJoinsState;
            });

            setSelectedQuery((prevSelectedQuery) => {
                if (prevSelectedQuery?.uuid === uuidToDelete) {
                    const deletedIndex = originalQueries.findIndex(
                        (q) => q.uuid === uuidToDelete
                    );
                    if (updatedQueries.length === 0) {
                        console.log(
                            `[BlendContext:deleteQuery] No queries left, deselecting.`
                        );
                        return null;
                    }
                    if (
                        deletedIndex > 0 &&
                        deletedIndex <= updatedQueries.length
                    ) {
                        console.log(
                            `[BlendContext:deleteQuery] Selecting previous query: ${
                                updatedQueries[deletedIndex - 1].uuid
                            }`
                        );
                        return updatedQueries[deletedIndex - 1];
                    }
                    console.log(
                        `[BlendContext:deleteQuery] Selecting first query: ${updatedQueries[0].uuid}`
                    );
                    return updatedQueries[0];
                }
                return prevSelectedQuery;
            });
            console.log(
                `[BlendContext:deleteQuery] Deletion process complete for ${uuidToDelete}.`
            );
        },
        [setQueries, setJoins, setSelectedQuery]
    );

    // --- Keep validation functions as originally provided ---
    const validateJoin = (join: IJoin) => {
        if (!join.from_field?.length) {
            return false;
        }
        if (!join.to_field?.length) {
            return false;
        }
        return true;
    };

    // --- Replace the existing validateJoins function in BlendContext.tsx with this ---
    // *** Added explicit IQueryJoin[] return type AND logic to ignore first query ***
    const validateJoins = useCallback((): IQueryJoin[] => {
        // Get the UUID of the first query in the list
        const firstQueryUuid = queries?.[0]?.uuid;

        // If there are no queries or no first query UUID, there can be no invalid joins
        if (!firstQueryUuid) {
            return [];
        }

        console.log(
            `[BlendContext:validateJoins] Validating joins, ignoring first query: ${firstQueryUuid}`
        );

        // Filter through all join configurations stored in the 'joins' state object
        const invalid_join_entries = Object.values(joins).filter((j_entry) => {
            // --- ADD THIS CHECK: ---
            // If this join entry targets the first query, it's NOT considered for validation.
            if (!j_entry || j_entry.to_query_id === firstQueryUuid) {
                // console.log(`[BlendContext:validateJoins] Skipping validation for first query entry: ${j_entry?.to_query_id}`);
                return false; // Exclude the first query's entry from the invalid list
            }
            // --- END ADDED CHECK ---

            // For all other queries (index 1+), check if they have any invalid join conditions defined
            // An entry is invalid if its 'joins' array exists and contains at least one condition
            // where from_field or to_field is empty (checked by validateJoin).
            const hasInvalidCondition =
                j_entry.joins &&
                j_entry.joins.some((condition) => !validateJoin(condition));
            // if (hasInvalidCondition) {
            //   console.log(`[BlendContext:validateJoins] Found invalid condition in entry for: ${j_entry.to_query_id}`);
            // }
            return hasInvalidCondition;
        });

        // Return the array of IQueryJoin entries (excluding the first query) that contain errors
        console.log(
            `[BlendContext:validateJoins] Found ${invalid_join_entries.length} invalid join entries (excluding first query).`
        );
        return invalid_join_entries;

        // Now depends on 'queries' to identify the first one, 'joins' to check, and 'validateJoin' helper
    }, [queries, joins, validateJoin]);
    // --- End of replacement validateJoins block ---

    // --- Keep first_query_connection, potentially memoize ---
    const first_query_connection = useMemo(() => {
        const model = queries[0]?.explore.id.split('::')[0];
        const connection = model_connections[model];
        if (connection) {
            return connection;
        }
    }, [model_connections, queries]);

    useEffect(() => {
        if (!first_query_connection) {
            getModelConnection(queries[0]?.explore.id, true);
        }
    }, [first_query_connection]);

    // --- Provider Value ---
    return (
        <BlendContext.Provider
            value={{
                queries,
                setQueries,
                selectedQuery,
                joins,
                updateJoin,
                newJoin,
                newQuery, // Pass modified newQuery
                updateQuery,
                deleteQuery,
                duplicateQuery, // Pass simplified duplicateQuery
                updateJoinType,
                deleteJoin,
                selectQuery, // Pass object-accepting selectQuery
                resetAll, // Pass reset function
                validateJoin,
                validateJoins,
                first_query_connection,
                embed_connection,
                setEmbedConnection,
            }}
        >
            {children}
        </BlendContext.Provider>
    );
};

// --- NO INTERFACES ADDED - Assuming they exist elsewhere ---
