import {
  Box,
  FieldSelect,
  Icon,
  IconButton,
  SelectOptionGroupProps,
  SelectOptionObject,
  Tooltip,
} from "@looker/components";
import { Add, Delete, Error } from "@styled-icons/material";
import React from "react";
import { useBlendContext } from "../Context";

const JoinRow = ({
  join,
  query,
  to_fields,
  from_fields,
  join_type,
  index,
  is_last,
  join_length,
}: {
  join: IJoin;
  query: IQuery;
  to_fields: SelectOptionObject[];
  from_fields: SelectOptionGroupProps[];
  join_type: TJoinType;
  index: number;
  is_last: boolean;
  join_length: number;
}) => {
  const { updateJoin, newJoin, deleteJoin, validateJoin } = useBlendContext();

  const handleToFieldChange = (value: string) => {
    updateJoin(
      {
        ...join,
        to_field: value,
      },
      join_type
    );
  };

  const handleFromFieldChange = (value: string) => {
    const [query_uuid, field_id] = value.split("::");
    updateJoin(
      {
        ...join,
        from_field: field_id,
        from_query_id: query_uuid,
      },
      join_type
    );
  };
  const from_value = [join.from_query_id, join.from_field].join("::");
  const is_valid = validateJoin(join);
  console.log({ from_fields, from_value, to_fields, to_value: join.to_field });
  return (
    <Box
      flexGrow={1}
      display="flex"
      flexDirection="row"
      style={{ gap: "4px", color: "black" }}
    >
      <FieldSelect
        key={[join.from_query_id, join.from_field].join("::")}
        label={index === 0 ? "From Field" : undefined}
        options={from_fields}
        value={from_value.length > 2 ? from_value : ""}
        onChange={handleFromFieldChange}
      />
      <FieldSelect
        key={join.to_field}
        label={index === 0 ? "To Field" : undefined}
        options={to_fields}
        value={join.to_field}
        onChange={handleToFieldChange}
      />
      <IconButton
        label="Delete Join"
        icon={<Delete fontSize={16} color="black" />}
        style={{
          alignSelf: "center",
          marginBottom: index === 0 ? "-18px" : "0px",
          visibility: join_length > 1 ? "visible" : "hidden",
        }}
        onClick={() => {
          deleteJoin(join.to_query_id, join.uuid);
        }}
      />
      <IconButton
        label="Add Join"
        icon={<Add fontSize={16} color="black" />}
        style={{
          alignSelf: "center",
          marginBottom: index === 0 ? "12px" : "0px",
          visibility: is_last ? "visible" : "hidden",
        }}
        disabled={!is_valid}
        onClick={() => {
          newJoin("", query.uuid, "", "", join_type);
        }}
      />
      <Tooltip content="Invalid joins, please select fields">
        <Icon
          style={{
            alignSelf: "center",
            marginBottom: index === 0 ? (is_last ? "12px" : "-18px") : "0px",
            visibility: !is_valid ? "visible" : "hidden",
          }}
          icon={<Error fontSize={16} color="red" />}
        />
      </Tooltip>
    </Box>
  );
};

export default JoinRow;
