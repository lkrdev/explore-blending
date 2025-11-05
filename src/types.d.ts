declare module '*.md' {
    const content: string;
    export default content;
}

interface IQuery {
    uuid: string;
    query_id: string;
    explore: {
        id: string;
        label: string;
        new_label?: string;
    };
    fields: {
        id: string;
        label: string;
        type: 'dimension' | 'measure';
    }[];
    respect_limit?: true;
    alias?: string;
}
interface IQueryJoin {
    to_query_id: string;
    joins: IJoin[];
    type: TJoinType;
}
interface IJoin {
    uuid: string;
    from_query_id: string;
    to_query_id: string;
    from_field: string;
    to_field: string;
}
interface IExploreField {
    explore_id: string;
    id: string;
    label: string;
    label_short: string;
    view_label: string;
    type: 'dimension' | 'measure';
    lookml_type: string;
}

type TJoinType = 'inner' | 'left' | 'right' | 'full' | 'cross';

interface IBlendData {
    queries: IQuery[];
    joins: { [key: string]: IQueryJoin };
}

interface IBlendQueryInput {
    queries: string[];
    query_uuids: string[];
    joins: ITranslatedJoin[];
    new_explore_labels: (string | undefined)[];
    aliases: (string | undefined)[];
    l_i: number[];
}

interface IBlendQueryOutput {
    queries: string[];
    query_uuids: string[];
    joins: ITranslatedJoin[];
    new_explore_labels: string[];
    nel_i: number[];
    aliases: (string | undefined)[];
    a_i: number[];
    l_i: number[];
}

interface ITranslatedJoin {
    type: TJoinType;
    joins: ITranslatedJoinItem[];
}

interface ITranslatedJoinItem {
    from_query_index: number;
    from_field: string;
    to_field: string;
}

interface IBlendField {
    name: string;
    sql_alias: string;
    label_short: string;
    view_label: string;
    group_label?: string;
    description?: string;
    type: string;
    query_uuid: string;
    query_alias: string | undefined;
    field_type: 'dimension' | 'measure';
}

interface IBlendPayload {
    uuid: string;
    url: string | undefined;
    fields: IBlendField[];
    sql: string;
    explore_ids: string[];
    project_name: string;
    user_attribute: string;
    repo_name: string;
    includes: string;
    lookml_model: string;
    connection_name: string;
    user_commit_comment?: string;
    create_measures: boolean;
    dry_run: boolean;
    add_access_grant: boolean;
}

interface INewQuery {
    explore_id: string;
    explore_label: string;
    create_join?: boolean;
    initialFields?: IQuery['fields'];
    query_id?: string;
}
