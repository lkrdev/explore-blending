import { List, ListItem, Span } from "@looker/components";
import React from "react";
import { useBlendContext } from "./Context";

export const QueryList: React.FC = () => {
  const { queries, selectedQuery, selectQuery } = useBlendContext();
  console.log({ queries, selectedQuery });
  return (
    <List density="-2" selected={selectedQuery?.uuid}>
      {queries.map((query) => (
        <ListItem
          key={query.uuid}
          selected={selectedQuery?.uuid === query.uuid}
          onClick={() => selectQuery(query)}
        >
          <Span>{query.explore.label}</Span>
          <List density="-3">
            {query.fields.map((field) => (
              <ListItem
                size="small"
                key={field.id}
                itemRole="none"
                style={{ pointerEvents: "none" }}
                color={field.type}
              >
                {field.label}
              </ListItem>
            ))}
          </List>
        </ListItem>
      ))}
    </List>
  );
};
