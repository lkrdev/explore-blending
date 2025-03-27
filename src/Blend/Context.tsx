import { isEqual } from "lodash";
import uniqueId from "lodash/uniqueId";
import React, { createContext, useContext, useState } from "react";

interface IBlendContext {
  queries: IQuery[];
  setQueries: (queries: IQuery[]) => void;
  selectedQuery: IQuery | null;
  selectQuery: (query: IQuery) => void;
  joins: { [key: string]: IJoin[] };
  updateJoin: (join: IJoin) => void;
  newJoin: (from_query_id: string, to_query_id: string) => void;
  newQuery: (explore_id: string, explore_label: string) => void;
  deleteQuery: (uuid: string) => void;
  updateQuery: (query: IQuery) => void;
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
        id: "order_items_big.order_date",
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
        id: "order_items_big.order_date",
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
  const [joins, setJoins] = useState<{ [key: string]: IJoin[] }>({});

  const newQuery = (explore_id: string, explore_label: string) => {
    const uuid = uniqueId("query");
    const newQuery = {
      uuid,
      query_id: "",
      explore: { id: explore_id, label: explore_label },
      fields: [] as IQuery["fields"],
    };
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

  const updateJoin = (join: IJoin) => {
    setJoins({
      ...joins,
      [join.from_query_id]: [...(joins[join.from_query_id] || []), join],
    });
  };
  const newJoin = (from_query_id: string, to_query_id: string) => {
    setJoins({
      ...joins,
      [from_query_id]: [
        ...(joins[from_query_id] || []),
        { from_query_id, to_query_id, fields: [] },
      ],
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
      }}
    >
      {children}
    </BlendContext.Provider>
  );
};
