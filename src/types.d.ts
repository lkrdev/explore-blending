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
  
  interface IJoin {
    from_query_id: string;
    to_query_id: string;
    fields: string[];
  }
  interface IExploreField {
    explore_id: string;
    id: string;
    label: string;
    type: "dimension" | "measure";
  }