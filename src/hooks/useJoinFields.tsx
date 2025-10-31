import { SelectOptionGroupProps, SelectOptionObject } from "@looker/components";
import { forEach } from "lodash";
import { useMemo } from "react";
import { useAppContext } from "../AppContext";
import { useBlendContext } from "../Blend/Context";

const useJoinFields = (evaluate_query: IQuery) => {

    const { getExploreField } = useAppContext();

    const { queries } = useBlendContext()

    // --- useMemo for fields (Original structure + safety checks) ---
    // This calls getExploreField directly - potential timeout risk remains
    const { to_fields, from_fields } = useMemo(() => {
        let to_fields_calc: SelectOptionObject[] = [];
        let from_fields_calc: SelectOptionGroupProps[] = [];

        forEach(queries, (query, index) => {
            const exploreId = query.explore?.id;
            if (!exploreId) return;
            forEach(query.fields, (field) => {
                const found_field = getExploreField(exploreId, field.id); // Direct call
                const in_current_query = evaluate_query.uuid === query.uuid;
                if (found_field) {
                    if (in_current_query) { to_fields_calc.push({ label: found_field.label || field.id, value: field.id }); }
                    else {
                        const groupLabel = `${query.explore?.new_label || query.explore?.label || 'Query'} (${(index + 1).toLocaleString()})`;
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
    }, [evaluate_query, queries, getExploreField]);
    // --- End useMemo ---

    return { to_fields, from_fields }
}

export default useJoinFields;
