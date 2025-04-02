import { List, ListItem, Span, Spinner } from "@looker/components";
import uniq from "lodash/uniq";
import React, { useEffect } from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../../AppContext";
import { useBlendContext } from "../Context";

export const QueryList: React.FC = () => {
  const { queries, selectedQuery, selectQuery } = useBlendContext();
  const loading = useBoolean(true);
  const { getExploreFields, getExploreField } = useAppContext();
  useEffect(() => {
    initialExploresFields();
  }, []);

  const initialExploresFields = async () => {
    const explores = uniq(queries.map((query) => query.explore.id));
    const promises = explores.map(async (explore) => {
      return getExploreFields(explore);
    });
    const _explore_fields = await Promise.all(promises);

    loading.setFalse();
  };

  if (loading.value) {
    return <Spinner />;
  } else {
    return (
      <List density="-2" selected={selectedQuery?.uuid}>
        {queries.map((query) => (
          <ListItem
            key={query.uuid}
            selected={selectedQuery?.uuid === query.uuid}
            onClick={() => selectQuery(query.uuid)}
          >
            <Span>{query.explore.label}</Span>
            <List density="-3">
              {query.fields.map((field) => {
                const field_metadata = getExploreField(
                  query.explore.id,
                  field.id
                );

                return (
                  <ListItem
                    size="small"
                    key={`${query.uuid}-${field.id}`}
                    itemRole="none"
                    style={{ pointerEvents: "none" }}
                    color={field_metadata?.type || field.type}
                  >
                    {field_metadata?.label || field.id}
                  </ListItem>
                );
              })}
            </List>
          </ListItem>
        ))}
      </List>
    );
  }
};
