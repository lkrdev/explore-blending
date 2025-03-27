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
