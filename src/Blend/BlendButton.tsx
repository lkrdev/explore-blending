import {
  Box,
  Checkbox,
  Icon,
  IconButton,
  Label,
  Space,
  Tooltip,
} from "@looker/components";
import { Code, Error } from "@styled-icons/material";
import { format } from "prettier-sql";
import React, { useState } from "react";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../AppContext";
import LoadingButton from "../components/ProgressButton";
import { API_URL, ARTIFACT_NAMESPACE } from "../constants";
import useExtensionSdk from "../hooks/useExtensionSdk";
import useSdk from "../hooks/useSdk";
import { useSearchParams } from "../hooks/useSearchParams";
import { useSettings } from "../SettingsContext";
import { getConnectionDialect, getConnectionModel } from "../utils";
import { useBlendContext } from "./Context";
import { SeeSqlDialog } from "./SeeSqlDialog";

interface BlendButtonProps {}

const getExploreLabel = (q: IQuery, f: IExploreField) => {
  if (q.explore.new_label) {
    return q.explore.new_label;
  } else {
    return q.explore.label + " - " + q.uuid;
  }
};

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
  const {
    queries,
    joins,
    validateJoins,
    first_query_connection,
    stripLimits,
    setStripLimits,
  } = useBlendContext();
  const openDialog = useBoolean(false);
  const can_blend = queries.length > 1;
  const loading = useBoolean(false);
  const sdk = useSdk();
  const extension = useExtensionSdk();
  const { lookerHostData } = extension;
  const { search_params } = useSearchParams();
  const { getExploreField, user } = useAppContext();
  const { config, getUserCommitComment } = useSettings();
  const [error, setError] = useState<string | undefined>();

  const safeQueryForWith = (sql: string): string => {
    // 1. Trim whitespace from the beginning and end
    let trimmedSql = sql.trim();

    // 2. Remove a potential trailing semicolon.
    // A semicolon inside the parentheses defining a CTE is usually a syntax error.
    if (trimmedSql.endsWith(";")) {
      trimmedSql = trimmedSql.slice(0, -1).trimEnd(); // Remove semicolon and any space before it
    }

    // 3. Wrap the entire potentially complex query in parentheses.
    // This makes it a valid subquery/derived table expression suitable
    // for use as a CTE definition body.
    return `(${trimmedSql})`;
  };

  const getQuerySql = async (dialect: string, b_query_param: string) => {
    // Step 1: Fetch SQL from Looker SDK for each query
    const promises = queries.map((q) => {
      // Fetch the SQL as defined in Looker, without adding a limit override
      return sdk.ok(
        sdk.run_query({
          query_id: q.query_id,
          result_format: "sql",
        })
      );
    });

    // Wait for all SQL results
    const query_sql_results = await Promise.all(promises);

    // Step 2: Process each raw SQL string
    // --- START: Replace this .reduce() block with the Debugging Version ---
    const query_sql = query_sql_results.reduce((acc, rawSqlResult, i) => {
      const queryId = queries[i].query_id; // Get query ID for logging
      console.log(`--- Processing Query Index: ${i}, ID: ${queryId} ---`);
      console.log("Step 0: Raw SQL Result:\n", rawSqlResult);

      // Start processing
      let processedSql = rawSqlResult.trim();
      console.log("Step 0a: After initial trim:\n", processedSql);

      // Step 1: Remove Metadata Query Block
      const sqlBeforeMetaRemoval = processedSql;
      processedSql = processedSql
        .replace(/-- sql for creating the total[\s\S]*$/i, "")
        .trim();
      if (sqlBeforeMetaRemoval !== processedSql) {
        console.log("Step 1: After Metadata Removal:\n", processedSql);
      } else {
        console.log("Step 1: Metadata Removal - No change detected.");
      }

      // Step 2: Remove Trailing ORDER BY Clause
      const sqlBeforeOrderByRemoval = processedSql;
      // Matches ORDER BY followed by typical column/number/direction lists, until the end. Less greedy.
      processedSql = processedSql
        .replace(
          /\sORDER\s+BY\s+[a-zA-Z0-9_.,\s()'"\-\`\[\]]+(?: ASC| DESC)?\s*$/i,
          ""
        )
        .trim();
      if (sqlBeforeOrderByRemoval !== processedSql) {
        console.log("Step 2: After ORDER BY Removal:\n", processedSql);
      } else {
        console.log("Step 2: ORDER BY Removal - No change detected.");
      }

      // Step 3: Conditional Limit Removal
      console.log(`Step 3: Checking stripLimits: ${stripLimits}`);
      if (stripLimits) {
        const sqlBeforeLimitRemoval = processedSql;
        processedSql = processedSql.replace(/LIMIT\s+\d+\s*$/i, "").trim();
        processedSql = processedSql
          .replace(/FETCH\s+(NEXT|FIRST)\s+\d+\s+ROWS?\s+ONLY\s*$/i, "")
          .trim();
        if (sqlBeforeLimitRemoval !== processedSql) {
          console.log(
            "Step 3a: After Conditional Limit Removal:\n",
            processedSql
          );
        } else {
          console.log(
            "Step 3a: Conditional Limit Removal - No change detected."
          );
        }
      } else {
        console.log(
          "Step 3a: Conditional Limit Removal - Skipped (stripLimits is false)."
        );
      }

      // Final Checks & Assignment
      processedSql = processedSql.trim();
      if (!processedSql) {
        console.warn(
          `Query ${queryId} (Index: ${i}) resulted in empty SQL after processing. Raw SQL was:\n${rawSqlResult}`
        );
        processedSql = "-- Error: Processed SQL was empty";
      }
      console.log(
        "Step 4: Final Processed SQL for Accumulator:\n",
        processedSql
      );
      console.log(`--- Finished Processing Query Index: ${i} ---`);

      return {
        ...acc,
        [queries[i].uuid]: processedSql, // Assign the processed SQL
      };
    }, {} as { [key: string]: string });

    // Step 3: Construct the final blended SQL query (Structure remains the same)
    const new_sql = `
${b_query_param?.length ? `-- b=${b_query_param}` : ""}
WITH ${`${queries
      .map(
        (q, i) =>
          // safeQueryForWith wraps the CLEANED SQL in parentheses
          `${q.uuid} AS ${safeQueryForWith(
            query_sql[q.uuid as keyof typeof query_sql]
          )}${i < queries.length - 1 ? "," : ""}`
      )
      .join("\n")}`}
SELECT ${getFieldSelectList(queries, dialect)} FROM ${queries[0].uuid}
${queries
  .slice(1)
  .map((q) => {
    const j = joins[q.uuid as keyof typeof joins];
    if (j) {
      return getJoinSql(j, dialect);
    }
    return null;
  })
  .filter(Boolean)
  .join("\n")}`;

    return format(new_sql, { language: "sql" });
  };

  const handleLookMLBlend = async () => {
    const connection_meta = await sdk.ok(
      sdk.connection(first_query_connection!)
    );
    if (!config) {
      console.error("No config available");
      return;
    }
    const b_param = search_params.get("b") || "";
    const query_sql = await getQuerySql(
      getConnectionDialect(connection_meta),
      b_param
    );

    const fields: IBlendField[] = [];
    queries.forEach((q) => {
      q.fields.forEach((f) => {
        const found = getExploreField(q.explore.id, f.id);
        if (found) {
          fields.push({
            name: f.id,
            sql_alias: fieldTransform(
              q.uuid,
              f,
              getConnectionDialect(connection_meta)
            ),
            label_short: found.label_short,
            view_label: getExploreLabel(q, found),
            type: found.lookml_type,
            query_uuid: q.uuid,
          });
        }
      });
    });
    const explore_ids = queries.map((q) => q.explore.id);
    const uuid = Array.from(crypto.getRandomValues(new Uint8Array(13)))
      .map((n) => String.fromCharCode(97 + (n % 26)))
      .join("");
    if (!config.project_name || !config.user_attribute || !config.repo_name) {
      console.error("Missing required config data");
      return;
    }
    const payload: IBlendPayload = {
      uuid,
      url: lookerHostData?.hostOrigin,
      fields: fields,
      sql: query_sql,
      explore_ids: explore_ids,
      project_name: config.project_name,
      user_attribute: config.user_attribute,
      repo_name: config.repo_name,
      includes: config.includes || "",
      lookml_model: getConnectionModel(
        first_query_connection || "",
        config.connection_model_mapping
      ),
      connection_name: connection_meta.name || "",
      user_commit_comment: getUserCommitComment(
        user!,
        config.user_commit_comment || []
      ),
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-personal-access-token": extension.createSecretKeyTag(
        "personal_access_token"
      ),
      "x-base-url": lookerHostData?.hostOrigin || "",
      "x-webhook-secret": extension.createSecretKeyTag("webhook_secret"),
    };
    if (config.access_grants) {
      headers["x-client-id"] = extension.createSecretKeyTag("client_id");
      headers["x-client-secret"] =
        extension.createSecretKeyTag("client_secret");
    }
    try {
      const api_url = config.override_api?.length
        ? config.override_api
        : API_URL;
      const r = await extension.serverProxy(api_url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: headers,
      });

      if (r.status === 200) {
        try {
          const _artifact = await sdk.ok(
            sdk.update_artifacts(ARTIFACT_NAMESPACE, [
              {
                key: uuid,
                value: JSON.stringify({
                  queries,
                  joins,
                  payload,
                }),
                content_type: "application/json",
              },
            ])
          );
        } catch (e) {
          console.error(e);
        }
        for (var i = 0; i < 20; i++) {
          try {
            const _explore = await sdk.ok(
              sdk.lookml_model_explore({
                lookml_model_name: r.body.lookml_model_name,
                explore_name: r.body.explore_name,
                fields: "id",
              })
            );
            if (_explore.id) {
              break;
            }
          } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        extension.openBrowserWindow(r.body.explore_url, "_blank");
        extension.updateLocation;
      } else {
        // @ts-ignore
        setError(r.status_text);
      }
    } catch (e) {
      setError(String(e));
      console.error(e);
    }
    loading.setFalse();
  };

  const handleBlend = async () => {
    setError(undefined);
    loading.setTrue();
    if (!config) {
      console.error("No config available");
      loading.setFalse();
      return;
    }
    if (config.lookml) {
      return handleLookMLBlend();
    }
    if (!first_query_connection) {
      console.error("No connection found");
      return;
    }
    const connection_meta = await sdk.ok(
      sdk.connection(first_query_connection)
    );
    const query_sql = await getQuerySql(
      getConnectionDialect(connection_meta),
      search_params.get("b") || ""
    );

    const create_sql = await sdk.ok(
      sdk.create_sql_query({
        sql: query_sql,
        connection_name: first_query_connection,
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
  const invalid_joins = validateJoins();
  const invalid_joins_text =
    invalid_joins.length > 0
      ? `Invalid joins: ${invalid_joins.map((j) => j.to_query_id).join(", ")}`
      : "";
  const disabled = !can_blend || loading.value || invalid_joins.length > 0;
  return (
    // Outer Box - This will now stack the Checkbox row and the Button/Icon row vertically

    <Box width="100%">
      {/* --- ROW 1: Checkbox + Label --- */}
      {/* This is the structure that fixed the checkbox alignment */}
      <Box display="flex" alignItems="center" mb="xsmall">
        <Checkbox
          checked={stripLimits}
          onChange={() => setStripLimits(!stripLimits)}
          disabled={loading.value}
          id="stripLimitsCheckbox"
        />
        <Label htmlFor="stripLimitsCheckbox">Unlimited Rows</Label>
      </Box>
      {/* --- End ROW 1 --- */}

      {/* --- ROW 2: Button + Icons (Aligned together) --- */}
      {/* Use Space with align="center" to manage this row */}
      {error && <Label>{error}</Label>}
      <Space align="center" gap="small">
        {" "}
        {/* Align items in THIS row vertically centered */}
        <LoadingButton
          is_loading={loading.value}
          onClick={handleBlend}
          disabled={disabled}
        >
          Blend
        </LoadingButton>
        {/* Icons - should now align with the Button in this row */}
        <IconButton
          size="medium"
          onClick={openDialog.setTrue}
          disabled={!can_blend || loading.value || invalid_joins.length > 0}
          icon={<Code size={24} />}
          label="SQL"
        />
        <Tooltip content={invalid_joins_text}>
          <Icon
            size="medium"
            icon={<Error size={24} />}
            style={{
              visibility: invalid_joins_text.length ? "visible" : "hidden",
            }}
          />
        </Tooltip>
      </Space>
      {/* --- End ROW 2 --- */}

      {/* Dialog remains outside this main layout structure */}
      {openDialog.value && (
        <SeeSqlDialog
          onClose={openDialog.setFalse}
          handleBlend={handleBlend}
          getQuerySql={async () => {
            // ... your async function ...
            if (!first_query_connection) {
              console.error("No connection found");
              return Promise.resolve("");
            } else {
              const connection_meta = await sdk.ok(
                sdk.connection(first_query_connection)
              );
              return getQuerySql(getConnectionDialect(connection_meta), "");
            }
          }}
        />
      )}
    </Box> // End Outer vertical Box
  );
};
