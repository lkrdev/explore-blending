export interface IDynamicFieldMetadata {
    label: string;
    type: 'dimension' | 'measure';
    is_table_calc?: boolean;
    lookml_type?: string;
}

export const parseDynamicFields = (dynamicFieldsJson: string | null | undefined): Record<string, IDynamicFieldMetadata> => {
    const dynamicFieldsMap: Record<string, IDynamicFieldMetadata> = {};
    if (!dynamicFieldsJson) return dynamicFieldsMap;

    try {
        const parsedDynamicFields = JSON.parse(dynamicFieldsJson);
        if (Array.isArray(parsedDynamicFields)) {
            parsedDynamicFields.forEach((df: any) => {
                const kind = df.category || df._kind_hint;
                if ((kind === 'dimension' || df.dimension) && !df.table_calculation) {
                    dynamicFieldsMap[df.dimension] = {
                        label: df.label || df.dimension,
                        type: 'dimension',
                        lookml_type: df._type_hint || df.type || 'string',
                    };
                } else if ((kind === 'measure' || df.measure) && !df.table_calculation) {
                    dynamicFieldsMap[df.measure] = {
                        label: df.label || df.measure,
                        type: 'measure',
                        lookml_type: df._type_hint || df.type || 'number',
                    };
                } else if (kind === 'table_calculation' || df.table_calculation) {
                    dynamicFieldsMap[df.table_calculation] = {
                        label: df.label || df.table_calculation,
                        type: 'dimension',
                        is_table_calc: true,
                    };
                }
            });
        }
    } catch (e) {
        console.error('Failed to parse dynamic_fields', e);
    }
    return dynamicFieldsMap;
};
