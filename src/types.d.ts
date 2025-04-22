declare module "*.md" {
  const content: string;
  export default content;
}

interface IQuery {
  uuid: string;
  query_id: string;
  explore: {
    id: string;
    label: string;
  };
  fields: {
    id: string;
    label: string;
    type: "dimension" | "measure";
  }[];
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
  type: "dimension" | "measure";
}

type TJoinType = "inner" | "left" | "right" | "full" | "cross";

interface IBlendData {
  queries: IQuery[];
  joins: { [key: string]: IQueryJoin };
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
  alias: string;
  label_short: string;
  view_label: string;
  group_label?: string;
  description?: string;
  type: string;
}
