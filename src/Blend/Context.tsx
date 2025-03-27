import get from "lodash/get";
import isEqual from "lodash/isEqual";
import uniqueId from "lodash/uniqueId";
import React, { createContext, useContext, useState } from "react";
import { useAppContext } from "../AppContext";

interface IBlendContext {
  queries: IQuery[];
  setQueries: (queries: IQuery[]) => void;
  selectedQuery: IQuery | null;
  selectQuery: (query: IQuery) => void;
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
  newQuery: (explore_id: string, explore_label: string) => Promise<void>;
  deleteQuery: (uuid: string) => void;
  updateQuery: (query: IQuery) => void;
  deleteJoin: (to_query_id: string, join_uuid: string) => void;
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
    uuid: uniqueId("query"),
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
    uuid: uniqueId("query"),
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

export const BlendContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queries, setQueries] = useState<IQuery[]>(DEV_QUERIES);
  const [selectedQuery, setSelectedQuery] = useState<IQuery | null>(
    DEV_QUERIES[0]
  );
  const [joins, setJoins] = useState<{ [key: string]: IQueryJoin }>({
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
  });

  const { getExploreFields } = useAppContext();

  const newQuery = async (explore_id: string, explore_label: string) => {
    const uuid = uniqueId("query");
    const newQuery = {
      uuid,
      query_id: "",
      explore: { id: explore_id, label: explore_label },
      fields: [] as IQuery["fields"],
    };
    const _explore_fields = await getExploreFields(explore_id);
    setQueries((p) => [...p, newQuery]);
    setSelectedQuery(newQuery);
  };

  const selectQuery = (query: IQuery) => {
    setSelectedQuery(query);
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
  return (
    <BlendContext.Provider
      value={{
        queries,
        setQueries,
        selectedQuery,
        selectQuery,
        joins,
        updateJoin,
        newJoin,
        newQuery,
        updateQuery,
        deleteQuery,
        updateJoinType,
        deleteJoin,
      }}
    >
      {children}
    </BlendContext.Provider>
  );
};
