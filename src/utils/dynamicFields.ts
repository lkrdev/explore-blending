interface IDynamicFieldMetadata extends Omit<IQuery['fields'][0], 'id'> {
    dimension?: string;
    measure?: string;
    table_calculation?: string;
    category?: string;
    _kind_hint?: string;
    _type_hint?: string;
}

export const parseDynamicFields = (
    dynamicFieldsJson: string | null | undefined,
): Record<string, IQuery['fields'][0]> => {
    const dynamicFieldsMap: Record<string, IQuery['fields'][0]> = {};
    if (!dynamicFieldsJson) return dynamicFieldsMap;

    try {
        const parsedDynamicFields: IDynamicFieldMetadata[] =
            JSON.parse(dynamicFieldsJson);
        if (Array.isArray(parsedDynamicFields)) {
            parsedDynamicFields.forEach((df) => {
                const kind = df.category || df._kind_hint;
                const key = df.dimension || df.measure || df.table_calculation;
                if (!key?.length) {
                    console.warn('Dynamic field without key', df);
                    return;
                }
                if (
                    (kind === 'dimension' || df.dimension) &&
                    !df.table_calculation
                ) {
                    dynamicFieldsMap[key] = {
                        id: key,
                        label: df.label || key,
                        type: 'dimension',
                        lookml_type: df._type_hint || df.type || 'string',
                    };
                } else if (
                    (kind === 'measure' || df.measure) &&
                    !df.table_calculation
                ) {
                    dynamicFieldsMap[key] = {
                        id: key,
                        label: df.label || df.measure || key,
                        type: 'measure',
                        lookml_type: df._type_hint || df.type || 'number',
                    };
                } else if (
                    kind === 'table_calculation' ||
                    df.table_calculation
                ) {
                    dynamicFieldsMap[key] = {
                        id: key,
                        label: df.label || df.table_calculation || key,
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
