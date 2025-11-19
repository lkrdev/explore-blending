export type TPDTMeta = {
    connection_registration_key: string;
    model: string;
    view: string;
    scratch_schema: string;
    built_pdt_lr: string;
    built_pdt_lc: string;
    stable_pdt_view_name: string;
    project: string;
    encapsulator: string;
};

export const getPDTMeta = (sql: string) => {
    const pdt_building_regex =
        /-- Building persistent derived table ([^:]+)::([^\s]+)\s/i;
    const match = pdt_building_regex.exec(sql);
    const model = match?.[1] || '';
    const view = match?.[2] || '';

    // Match the finished comment to extract full table reference with quotes and project
    // Examples:
    // -- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
    // -- finished select_one => `bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one`
    // -- finished select_one => "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one"
    const finished_regex = /-- finished [^ ]+ => ([`"]?)([^`"]+)\1/i;
    const finished_match = finished_regex.exec(sql);

    const encapsulator = finished_match?.[1] || '';
    const full_table_ref = finished_match?.[2] || '';

    // Parse the table reference: [project.]schema.table_name
    // Split by dots and extract components
    const parts = full_table_ref.split('.');
    let project = '';
    let scratch_schema = '';
    let table_name = '';

    if (parts.length === 3) {
        // Has project: project.schema.table
        project = parts[0];
        scratch_schema = parts[1];
        table_name = parts[2];
    } else if (parts.length === 2) {
        // No project: schema.table
        scratch_schema = parts[0];
        table_name = parts[1];
    }

    // Extract connection key and other parts from table name
    // Table name format: L[CR][_$]XXYYYYYY_view_name
    const table_regex = /(L[CR][_\$])([A-Z0-9]{2})([A-Z0-9_]+)/i;
    const table_match = table_regex.exec(table_name);

    const prefix = table_match?.[1] || '';
    const connection_registration_key = table_match?.[2] || '';
    const suffix = table_match?.[3] || '';

    const built_pdt_lr =
        scratch_schema && connection_registration_key
            ? `LR${prefix.slice(2)}${connection_registration_key}${suffix}`
            : '';
    const built_pdt_lc =
        scratch_schema && connection_registration_key
            ? `LC${prefix.slice(2)}${connection_registration_key}${suffix}`
            : '';

    return {
        connection_registration_key,
        model,
        view,
        scratch_schema,
        built_pdt_lr,
        built_pdt_lc,
        project: project,
        stable_pdt_view_name: getStablePdtViewName(
            model,
            view,
            connection_registration_key,
            scratch_schema,
        ),
        encapsulator,
    } as TPDTMeta;
};

const getStablePdtViewName = (
    model: string,
    view: string,
    connection_registration_key: string,
    scratch_schema: string,
) => {
    return `${scratch_schema}.${connection_registration_key}_${model}_${view}`;
};

export const replaceSelectWithPdtView = (sql: string, pdt_meta: TPDTMeta[]) => {
    let new_sql = sql;
    pdt_meta.forEach((meta) => {
        const {
            project,
            scratch_schema,
            built_pdt_lr,
            built_pdt_lc,
            stable_pdt_view_name,
            encapsulator,
        } = meta;
        const project_prefix = project ? `${project}.` : '';

        const stable_name = `${encapsulator}${project_prefix}${stable_pdt_view_name}${encapsulator}`;

        if (built_pdt_lr) {
            const lr_name = `${encapsulator}${project_prefix}${scratch_schema}.${built_pdt_lr}${encapsulator}`;
            new_sql = new_sql.split(lr_name).join(stable_name);
        }
        if (built_pdt_lc) {
            const lc_name = `${encapsulator}${project_prefix}${scratch_schema}.${built_pdt_lc}${encapsulator}`;
            new_sql = new_sql.split(lc_name).join(stable_name);
        }
    });
    return new_sql;
};
