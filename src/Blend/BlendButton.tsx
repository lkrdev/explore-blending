import { Box, Button, IconButton, Space, Spinner } from "@looker/components";
import { Code } from "@styled-icons/material";
import React from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import { useSearchParams } from "../hooks/useSearchParams";
import { useExtensionContext } from "../Main";
import { useBlendContext } from "./Context";
import { SeeSqlDialog } from "./SeeSqlDialog";

interface BlendButtonProps {}

const getJoinTypeSql = (join_type: TJoinType) => {
  const joins = {
    inner: "INNER JOIN",
    left: "LEFT JOIN",
    right: "RIGHT JOIN",
    full: "FULL JOIN",
    cross: "CROSS JOIN",
  };
  return joins[join_type];
};

const getJoinSql = (join: IQueryJoin, dialect: string) => {
  let sql = `${getJoinTypeSql(join.type)} ${join.to_query_id} ON `;
  join.joins.forEach((j, i) => {
    sql += `${fieldGetter(
      j.from_query_id,
      { id: j.from_field },
      dialect
    )} = ${fieldGetter(j.to_query_id, { id: j.to_field }, dialect)}`;
    if (i < join.joins.length - 1) {
      sql += "\nAND ";
    }
  });
  return sql;
};

const fieldTransform = (
  uuid: string,
  field: Pick<IQuery["fields"][number], "id">,
  dialect: string
) => {
  if (dialect === "bigquery_standard_sql") {
    return `${uuid}_${field.id.replace(".", "_")}`;
  }
  return `"${uuid}.${field.id}"`;
};

const fieldGetter = (
  uuid: string,
  field: Pick<IQuery["fields"][number], "id">,
  dialect: string
) => {
  if (dialect === "bigquery_standard_sql") {
    return `${uuid}.${field.id.replace(".", "_")}`;
  }
  return `${uuid}."${field.id}"`;
};

const getFieldSelectList = (queries: IQuery[], dialect: string) => {
  return queries
    .map((q) => {
      return q.fields
        .map(
          (f) =>
            `${fieldGetter(q.uuid, f, dialect)} AS ${fieldTransform(
              q.uuid,
              f,
              dialect
            )}`
        )
        .join(", ");
    })
    .join(", ");
};

export const BlendButton: React.FC<BlendButtonProps> = ({}) => {
  const { queries, joins } = useBlendContext();
  const { models, connections } = useAppContext();
  const openDialog = useBoolean(false);
  const can_blend = queries.length > 1;
  const loading = useBoolean(false);
  const sdk = useExtensionContext().core40SDK;
  const extension = useExtensionContext().extensionSDK;
  const { search_params } = useSearchParams();
  const getQuerySql = async (dialect: string, b_query_param: string) => {
    const promises = queries.map((q) => {
      return sdk.ok(
        sdk.run_query({
          query_id: q.query_id,
          result_format: "sql",
          limit: 90210,
        })
      );
    });
    const query_sql = (await Promise.all(promises)).reduce(
      (acc, p, i) => ({
        ...acc,
        [queries[i].uuid]: p
          .replace("FETCH NEXT 90210 ROWS ONLY", "")
          .replace("LIMIT 90210", "")
          .trim(),
      }),
      {} as { [key: string]: string }
    );
    const new_sql = `
${b_query_param?.length ? `-- b=${b_query_param}` : ""}
WITH ${`${queries
      .map(
        (q, i) => `${q.uuid} AS (
    ${query_sql[q.uuid as keyof typeof query_sql]}
    )${i < queries.length - 1 ? ", " : ""}`
      )
      .join("\n")}`}
SELECT ${getFieldSelectList(queries, dialect)} FROM ${[queries[0].uuid]}
    ${queries
      .map((q) => {
        const j = joins[q.uuid as keyof typeof joins];
        if (j) {
          return getJoinSql(j, dialect);
        }
      })
      .join("\n")}`;
    return new_sql;
  };

  const handleBlend = async () => {
    loading.setTrue();
    const connection = connections[queries[0].explore.id];
    const connection_meta = await sdk.ok(sdk.connection(connection));
    const query_sql = await getQuerySql(
      connection_meta.dialect_name || "",
      search_params.get("b") || ""
    );

    const create_sql = await sdk.ok(
      sdk.create_sql_query({
        sql: query_sql,
        connection_name: connection,
      })
    );

    if (create_sql.slug) {
      const _run_sql = await sdk.ok(sdk.run_sql_query(create_sql.slug, "json"));
      const url = `/extensions/${extension.lookerHostData?.extensionId}/blended/${create_sql.slug}`;
      extension.openBrowserWindow(url, "_blank");
    } else {
      console.error("Failed to create SQL query");
    }
    loading.setFalse();
  };

  return (
    <Box display="flex" dir="row" width="100%" justifyContent="space-between">
      <Space width="85%">
        <Button
          fullWidth
          size="medium"
          onClick={handleBlend}
          disabled={!can_blend || loading.value}
          isLoading={loading.value}
        >
          {loading.value ? (
            <Spinner
              size={24}
              color="black"
              style={{
                opacity: 1,
                filter: "brightness(0)",
                borderWidth: "6px",
              }}
            />
          ) : (
            "Blend"
          )}
        </Button>
        <IconButton
          size="medium"
          onClick={openDialog.setTrue}
          disabled={!can_blend || loading.value}
          icon={<Code size={24} />}
          tooltip="SQL"
        />
      </Space>
      {openDialog.value && (
        <SeeSqlDialog
          onClose={openDialog.setFalse}
          handleBlend={handleBlend}
          getQuerySql={async () => {
            const connection = connections[queries[0].explore.id];
            const connection_meta = await sdk.ok(sdk.connection(connection));
            return getQuerySql(connection_meta.dialect_name || "", "");
          }}
        />
      )}
    </Box>
  );
};
