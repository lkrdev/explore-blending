import get from "lodash/get";
import isEqual from "lodash/isEqual";
import uniqueId from "lodash/uniqueId";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAppContext } from "../AppContext";
import { useSearchParams } from "../hooks/useSearchParams";

interface IBlendContext {
  queries: IQuery[];
  setQueries: (queries: IQuery[]) => void;
  selectedQuery: IQuery | null;
  selectQuery: (uuid: string) => void;
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
  newQuery: (
    explore_id: string,
    explore_label: string,
    create_join?: boolean
  ) => Promise<void>;
  deleteQuery: (uuid: string) => void;
  updateQuery: (query: IQuery) => void;
  deleteJoin: (to_query_id: string, join_uuid: string) => void;
  connection?: string;
  validateJoin: (join: IJoin) => boolean;
}

export const BlendContext = createContext<IBlendContext | undefined>(undefined);

export const useBlendContext = () => {
  const context = useContext(BlendContext);
  if (!context) {
    throw new Error(
      "useBlendContext must be used within a BlendContextProvider"
    );
  }
  return context;
};

const DEV_QUERIES = [
  {
    uuid: uniqueId("q"),
    query_id: "K4ujJR7yBqjYsSPyD1O7YY",
    explore: {
      id: "az_load_test::order_items_big",
      label: "Order Items Big",
    },
    fields: [
      {
        id: "order_items_big.order_id",
        label: "Order ID",
        type: "dimension",
      },
      {
        id: "order_items_big.created_date",
        label: "Order Date",
        type: "dimension",
      },
      { id: "order_items_big.count", label: "Count", type: "measure" },
    ],
  },
  {
    uuid: uniqueId("q"),
    query_id: "onOhaqYIvzMpyt58cZ7JHV",
    explore: {
      id: "az_load_test::order_items_big",
      label: "Order Items Big",
    },
    fields: [
      {
        id: "order_items_big.user_id",
        label: "User ID",
        type: "dimension",
      },
      {
        id: "order_items_big.created_date",
        label: "Order Date",
        type: "dimension",
      },
      { id: "order_items_big.count", label: "Count", type: "measure" },
    ],
  },
] as IQuery[];

const DEV_JOINS = {
  [DEV_QUERIES[1].uuid]: {
    to_query_id: DEV_QUERIES[1].uuid,
    joins: [
      {
        uuid: "join3",
        from_query_id: "query1",
        to_query_id: "query2",
        from_field: "order_items_big.order_id",
        to_field: "order_items_big.user_id",
      },
      {
        uuid: "join4",
        from_query_id: "query1",
        to_query_id: "query2",
        from_field: "order_items_big.created_date",
        to_field: "order_items_big.created_date",
      },
    ],
    type: "inner",
  },
} as { [key: string]: IQueryJoin };

const setBlendData = (blend_data: IBlendData) => {
  if (
    blend_data.queries.length === 0 &&
    Object.keys(blend_data.joins).length === 0
  ) {
    return undefined;
  }
  const translateJoinsToQueryIds: (ITranslatedJoin | undefined)[] =
    blend_data.queries.map((q, i) => {
      const found_join = blend_data.joins[q.uuid];
      if (found_join) {
        return {
          type: found_join.type,
          joins: found_join.joins.map((j) => {
            const from_query = blend_data.queries.findIndex(
              (q) => q.uuid === j.from_query_id
            );
            return {
              from_query_index: from_query,
              from_field: j.from_field,
              to_field: j.to_field,
            };
          }),
        } as ITranslatedJoin;
      } else {
        return undefined;
      }
    });
  return btoa(
    JSON.stringify({
      queries: blend_data.queries.map((q) => q.query_id),
      joins: translateJoinsToQueryIds,
    })
  );
};

export const BlendContextProvider = ({
  blend_data,
  children,
}: {
  blend_data?: IBlendData;
  children: React.ReactNode;
}) => {
  const [queries, setQueries] = useState<IQuery[]>(blend_data?.queries || []);
  const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(
    blend_data?.queries.length
      ? blend_data?.queries[blend_data.queries.length - 1]
      : null
  );
  const [joins, setJoins] = useState<{ [key: string]: IQueryJoin }>(
    blend_data?.joins || {}
  );
  const { setSearchParams } = useSearchParams();

  const { getExploreFields } = useAppContext();

  useEffect(() => {
    setSearchParams({
      b: setBlendData({ queries, joins }),
    });
  }, [queries, joins]);

  const newQuery = async (
    explore_id: string,
    explore_label: string,
    create_join: boolean = false
  ) => {
    const uuid = uniqueId("query");
    const newQuery = {
      uuid,
      query_id: "",
      explore: { id: explore_id, label: explore_label },
      fields: [] as IQuery["fields"],
    };
    const _explore_fields = await getExploreFields(explore_id);

    if (create_join) {
      newJoin("", uuid, "", "", "inner");
    }
    setQueries((p) => [...p, newQuery]);
    setSelectedQuery(newQuery);
  };

  const updateQuery = async (query: IQuery) => {
    if (isEqual(selectedQuery, query)) {
      return;
    } else {
      setSelectedQuery(query);
      setQueries((p) => p.map((q) => (q.uuid === query.uuid ? query : q)));
    }
  };

  const updateJoinType = (to_query_id: string, type: TJoinType) => {
    setJoins((p) => ({
      ...p,
      [to_query_id]: {
        ...p[to_query_id],
        type,
      },
    }));
  };

  const updateJoin = (join: IJoin, type: TJoinType) => {
    const current_join: IQueryJoin | undefined = get(joins, [join.to_query_id]);
    if (!current_join) {
      newJoin(
        join.from_query_id,
        join.to_query_id,
        join.from_field,
        join.to_field,
        type
      );
    } else {
      setJoins((p) => ({
        ...p,
        [join.to_query_id]: {
          ...p[join.to_query_id],
          joins: p[join.to_query_id].joins.map((j) =>
            j.uuid === join.uuid ? join : j
          ),
        },
      }));
    }
  };
  const newJoin = (
    from_query_id: string,
    to_query_id: string,
    from_field: string,
    to_field: string,
    type: TJoinType
  ) => {
    setJoins((p) => {
      const newJoin = {
        uuid: uniqueId("join"),
        from_query_id,
        to_query_id,
        from_field,
        to_field,
      };
      if (p[to_query_id]) {
        return {
          ...p,
          [to_query_id]: {
            ...p[to_query_id],
            joins: [...p[to_query_id].joins, newJoin],
          },
        };
      } else {
        const newQueryJoin = {
          to_query_id,
          joins: [newJoin],
          type,
        } as IQueryJoin;
        return { ...p, [to_query_id]: newQueryJoin };
      }
    });
  };

  const deleteJoin = (to_query_id: string, join_uuid: string) => {
    setJoins((p) => {
      const newJoins = { ...p };
      newJoins[to_query_id].joins = newJoins[to_query_id].joins.filter(
        (j) => j.uuid !== join_uuid
      );
      return newJoins;
    });
  };

  const deleteQuery = (uuid: string) => {
    setQueries((p) => p.filter((q) => q.uuid !== uuid));
  };
  const selectQuery = (uuid: string) => {
    setSelectedQuery(queries.find((q) => q.uuid === uuid) || null);
  };

  const validateJoin = (join: IJoin) => {
    if (!join.from_field?.length) {
      return false;
    } else if (!join.to_field?.length) {
      return false;
    } else {
      return true;
    }
  };

  const validateJoins = (uuid: string) => {
    setSelectedQuery(queries.find((q) => q.uuid === uuid) || null);
  };

  return (
    <BlendContext.Provider
      value={{
        queries,
        setQueries,
        selectedQuery,
        joins,
        updateJoin,
        newJoin,
        newQuery,
        updateQuery,
        deleteQuery,
        updateJoinType,
        deleteJoin,
        selectQuery,
        validateJoin,
      }}
    >
      {children}
    </BlendContext.Provider>
  );
};
