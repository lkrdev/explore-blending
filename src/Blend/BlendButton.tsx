import { Box, Button, IconButton, Space } from "@looker/components";
import { Code } from "@styled-icons/material";
import React from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../AppContext";
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

const getJoinSql = (join: IQueryJoin) => {
  let sql = `${getJoinTypeSql(join.type)} ${join.to_query_id} ON `;
  join.joins.forEach((j, i) => {
    sql += `${j.from_query_id}."${j.from_field}" = ${j.to_query_id}."${j.to_field}"`;
    if (i < join.joins.length - 1) {
      sql += "\nAND ";
    }
  });
  return sql;
};

const getFieldSelectList = (queries: IQuery[]) => {
  return queries
    .map((q) => {
      return q.fields
        .map((f) => `${q.uuid}."${f.id}" as "${q.uuid}.${f.id}"`)
        .join(", ");
    })
    .join(", ");
};

export const BlendButton: React.FC<BlendButtonProps> = ({}) => {
  const { queries, joins } = useBlendContext();
  const { models } = useAppContext();
  const openDialog = useBoolean(false);
  const can_blend = queries.length > 1;
  const sdk = useExtensionContext().core40SDK;
  const extension = useExtensionContext().extensionSDK;
  const getQuerySql = async () => {
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
        [queries[i].uuid]: p.replace("FETCH NEXT 90210 ROWS ONLY", "").trim(),
      }),
      {} as { [key: string]: string }
    );
    const new_sql = `WITH ${`${queries
      .map(
        (q, i) => `${q.uuid} AS (
    ${query_sql[q.uuid as keyof typeof query_sql]}
    )${i < queries.length - 1 ? ", " : ""}`
      )
      .join("\n")}`}
SELECT ${getFieldSelectList(queries)} FROM ${[queries[0].uuid]}
    ${queries
      .map((q) => {
        const j = joins[q.uuid as keyof typeof joins];
        if (j) {
          return getJoinSql(j);
        }
      })
      .join("\n")}`;
    return new_sql;
  };

  const handleBlend = async () => {
    const query_sql = await getQuerySql();

    const create_sql = await sdk.ok(
      sdk.create_sql_query({
        sql: query_sql,
        connection_name: models[0].allowed_db_connection_names?.[0] || "",
      })
    );
    console.log(create_sql);
    if (create_sql.slug) {
      const run_sql = await sdk.ok(sdk.run_sql_query(create_sql.slug, "json"));
      console.log(run_sql);
      const sql_explore_id = `sql__${create_sql.slug}/sql_runner_query`;
      const url = `/extensions/${extension.lookerHostData?.extensionId}/blended/${sql_explore_id}`;
      extension.openBrowserWindow(url, "_blank");
    } else {
      console.error("Failed to create SQL query");
    }
  };

  return (
    <Box display="flex" dir="row" width="100%" justifyContent="space-between">
      <Space width="85%">
        <Button
          fullWidth
          size="medium"
          onClick={handleBlend}
          disabled={!can_blend}
        >
          Blend
        </Button>
        <IconButton
          size="medium"
          onClick={openDialog.setTrue}
          disabled={!can_blend}
          icon={<Code size={24} />}
          tooltip="SQL"
        />
      </Space>
      {openDialog.value && (
        <SeeSqlDialog
          onClose={openDialog.setFalse}
          handleBlend={handleBlend}
          getQuerySql={getQuerySql}
        />
      )}
    </Box>
  );
};
