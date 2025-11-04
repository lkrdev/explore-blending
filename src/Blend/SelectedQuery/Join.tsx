// --- Join.tsx (Reverted to version BEFORE useEffect fetching, but WITH default JoinRow render) ---

import {
    IconButton,
    Popover,
    PopoverLayout,
    SpaceVertical,
} from '@looker/components';
import { JoinInner } from '@styled-icons/material';
import React from 'react'; // Removed useEffect, useState
import { useTheme } from 'styled-components';
import { useBoolean } from 'usehooks-ts';
import { useAppContext } from '../../AppContext';
import useJoinFields from '../../hooks/useJoinFields';
import { useBlendContext } from '../Context';
import './join_popover.css';
import JoinRow from './JoinRow';
import JoinTypeSelect from './JoinTypeSelect';

const Join = ({
    popover_ref,
    hidden,
    disabled,
    query,
}: {
    popover_ref: React.RefObject<HTMLDivElement>;
    hidden: boolean;
    disabled: boolean;
    query: IQuery;
}) => {
    const popover_open = useBoolean(false);
    const theme = useTheme();
    const { getExploreField } = useAppContext();
    const {
        selectedQuery,
        queries,
        joins,
        validateJoin,
        updateJoinType,
        selectQuery,
    } = useBlendContext();

    // --- Safe Data Access ---
    if (!selectedQuery) {
        return null;
    }
    // Safely get join data, provide fallback structure if needed for type safety downstream
    const currentJoinData: IQueryJoin | undefined = joins[query.uuid];
    // Use type from data or default
    const currentJoinType: TJoinType = currentJoinData?.type || 'inner';
    // Use joins array from data, default to empty array
    const current_query_joins: IJoin[] = currentJoinData?.joins || [];
    // --- End Safe Data Access ---

    // // --- useMemo for fields (Original structure + safety checks) ---
    // // This calls getExploreField directly - potential timeout risk remains
    // const { to_fields, from_fields } = useMemo(() => {
    //   let to_fields_calc: SelectOptionObject[] = [];
    //   let from_fields_calc: SelectOptionGroupProps[] = [];
    //   if (!selectedQuery) return { to_fields: [], from_fields: [] };
    //   queries.forEach((query) => {
    //     const exploreId = query.explore?.id;
    //     if (!exploreId) return;
    //     (query.fields || []).forEach((field) => {
    //       const found_field = getExploreField(exploreId, field.id); // Direct call
    //       const in_current_query = query.uuid === selectedQuery.uuid;
    //       if (found_field) {
    //         if (in_current_query) { to_fields_calc.push({ label: found_field.label || field.id, value: field.id }); }
    //         else {
    //           const groupLabel = `${query.explore?.label || 'Query'} (${query.uuid})`;
    //           const current_group = from_fields_calc.find(g => g.label === groupLabel);
    //           const new_option = { label: found_field.label || field.id, value: [query.uuid, field.id].join("::") };
    //           if (!current_group) { from_fields_calc.push({ label: groupLabel, options: [new_option] }); }
    //           else { if (!current_group.options) current_group.options = []; current_group.options.push(new_option); }
    //         }
    //       }
    //       // Removed console warn about cache miss as there's no explicit pre-fetch now
    //     });
    //   });
    //   // Sorting logic
    //   from_fields_calc = from_fields_calc.map((group) => ({ ...group, options: (group.options || []).sort((a, b) => String(a.label).localeCompare(String(b.label))) }));
    //   return {
    //     to_fields: to_fields_calc.sort((a, b) => String(a.label).localeCompare(String(b.label))),
    //     from_fields: from_fields_calc.sort((a, b) => String(a.label).localeCompare(String(b.label))),
    //   };
    //   // Dependencies trigger recalculation, potentially causing repeated getExploreField calls
    // }, [selectedQuery, queries, getExploreField]);
    // // --- End useMemo ---

    const { to_fields, from_fields } = useJoinFields(query);

    // --- Rendering ---
    // Removed loading/error state rendering
    if (hidden) {
        return null;
    } else {
        const valid_joins = current_query_joins.map((j) => validateJoin(j));

        return (
            <Popover
                minWidth={'60vw'}
                width={'60vw'}
                placement="right"
                portalElement={popover_ref.current}
                isOpen={popover_open.value}
                onClose={popover_open.setFalse}
                id="join-popover"
                content={
                    <PopoverLayout header="Update Joins" footer>
                        <SpaceVertical width="100%">
                            <JoinTypeSelect
                                current={currentJoinType}
                                updateJoinType={(join_type: TJoinType) =>
                                    updateJoinType(
                                        currentJoinData.to_query_id,
                                        join_type
                                    )
                                }
                            />
                            {current_query_joins.map((j, index) => (
                                <JoinRow
                                    key={j.uuid}
                                    join={j}
                                    index={index}
                                    is_last={
                                        index === current_query_joins.length - 1
                                    }
                                    query={selectedQuery} // Assumes selectedQuery is not null here
                                    to_fields={to_fields} // Pass potentially empty fields if timeout occurred
                                    from_fields={from_fields} // Pass potentially empty fields if timeout occurred
                                    join_type={currentJoinType}
                                    join_length={current_query_joins.length}
                                />
                            ))}
                        </SpaceVertical>
                    </PopoverLayout>
                }
            >
                <IconButton
                    size="small"
                    onClick={() => {
                        selectQuery(query);
                        popover_open.setTrue();
                    }}
                    disabled={disabled}
                    toggle={false}
                    icon={
                        <JoinInner
                            color={
                                valid_joins.every(Boolean)
                                    ? undefined
                                    : theme.colors.critical
                            }
                            size={18}
                        />
                    }
                    label="Update Joins"
                />
            </Popover>
        );
    }
};

export default Join;
