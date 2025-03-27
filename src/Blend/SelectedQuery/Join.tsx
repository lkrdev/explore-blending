import {
  Box,
  FieldSelect,
  SelectOptionGroupProps,
  SelectOptionObject,
} from "@looker/components";
import React, { useMemo } from "react";
import { useAppContext } from "../../AppContext";
import { useBlendContext } from "../Context";
import JoinRow from "./JoinRow";

const Join = () => {
  const { getExploreField } = useAppContext();
  const { selectedQuery, queries, joins, updateJoinType } = useBlendContext();
  const join = joins[selectedQuery!.uuid];

  const { to_fields, from_fields } = useMemo(() => {
    let to_fields: SelectOptionObject[] = [];
    let from_fields: SelectOptionGroupProps[] = [];
    queries.forEach((query, index) => {
      query.fields.forEach((field) => {
        const found_field = getExploreField(query.explore.id, field.id);
        const in_current_query = query.uuid === selectedQuery!.uuid;
        if (found_field) {
          if (in_current_query) {
            to_fields.push({
              label: found_field.label,
              value: found_field.id,
            });
          } else {
            const current_group = from_fields.find(
              (group) => group.label === `${query.explore.label} (${index})`
            );
            const new_option = {
              label: found_field.label,
              value: [query.uuid, found_field.id].join("::"),
            };
            if (!current_group) {
              from_fields.push({
                label: `${query.explore.label} (${index})`,
                options: [new_option],
              });
            } else {
              current_group.options.push(new_option);
            }
          }
        }
      });
    });
    from_fields = from_fields.map((group) => ({
      ...group,
      options: group.options.sort((a, b) =>
        String(a.label).localeCompare(String(b.label))
      ),
    }));
    return {
      to_fields: to_fields.sort((a, b) =>
        String(a.label).localeCompare(String(b.label))
      ),
      from_fields: from_fields.sort((a, b) =>
        String(a.label).localeCompare(String(b.label))
      ),
    };
  }, [selectedQuery, queries, getExploreField]);

  return (
    <>
      <Box
        display="flex"
        position="absolute"
        top="0px"
        left="0px"
        style={{ gap: "4px" }}
        width="65%"
        height="84px"
        zIndex={1}
      >
        <FieldSelect
          width="90px"
          label="Join Type"
          options={[
            { label: "Inner", value: "inner" },
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
            { label: "Full", value: "full" },
            { label: "Cross", value: "cross" },
          ]}
          value={join.type}
          onChange={(value: string) => {
            updateJoinType(selectedQuery!.uuid, value as TJoinType);
          }}
        />
        <Box
          flexGrow={1}
          display="flex"
          flexDirection="column"
          style={{ gap: "4px" }}
        >
          {join.joins.map((j, index) => (
            <JoinRow
              key={j.uuid}
              join={j}
              index={index}
              is_last={index === join.joins.length - 1}
              query={selectedQuery!}
              to_fields={to_fields}
              from_fields={from_fields}
              join_type={join.type}
              join_length={join.joins.length}
            />
          ))}
        </Box>
      </Box>
      <Box height={Math.max(0, join.joins.length * 36 - 24)}></Box>
    </>
  );
};

export default Join;
