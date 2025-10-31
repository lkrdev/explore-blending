import {
  IconButton,
  Label,
  Space,
  SpaceVertical
} from "@looker/components";
import { JoinInner } from "@styled-icons/material";
import { format } from "prettier-sql";
import React, { useState } from "react";
import { useTheme } from "styled-components";
import { useBoolean } from "usehooks-ts";
import { useAppContext } from "../../AppContext";
import LoadingButton from "../../components/ProgressButton";
import { API_URL, ARTIFACT_NAMESPACE } from "../../constants";
import useExtensionSdk from "../../hooks/useExtensionSdk";
import useSdk from "../../hooks/useSdk";
import { useSearchParams } from "../../hooks/useSearchParams";
import { useSettings } from "../../SettingsContext";
import { getConnectionDialect, getConnectionModel } from "../../utils";
import { BlendDialog } from "../BlendDialog";
import { useBlendContext } from "../Context";
import BlendButtonProvider, { useBlendButtonContext } from "./BlendButtonContext";

const EXPLORE_POLL_RETRIES = 30;
const EXPLORE_POLL_DELAY = 2000;

interface BlendButtonProps { }

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

const BlendButton: React.FC<BlendButtonProps> = ({ }) => {
  const {
    queries,
    joins,
    validateJoins,
    first_query_connection,
  } = useBlendContext();
  const { toggle, setToggle, invalid_joins, invalid_joins_text } = useBlendButtonContext()
  const theme = useTheme();
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

  const getQueryOrSlug = async (query_id: string): Promise<string> => {
    // sometimes, looker doesn't like the new string query_id but the slug works.
    try {
      return await sdk.ok(
        sdk.run_query({
          query_id: query_id,
          result_format: "sql",
        })
      );
    } catch (e) {
      console.error(e);
    }

    try {
      const q4s = await sdk.ok(sdk.query_for_slug(query_id));
      if (q4s.id) {
        return await sdk.ok(
          sdk.run_query({
            query_id: q4s.id,
            result_format: "sql",
          })
        );
      }
    } catch (e) {
      console.error(e);
    }

    return `-- INVALID_QUERY_ID: ${query_id}, couldn't generate SQL. Please contact your looker administrator.`;
  };

  const getQuerySql = async (dialect: string, b_query_param: string) => {
    // Step 1: Fetch SQL from Looker SDK for each query
    const promises = queries.map((q) => {
      // Fetch the SQL as defined in Looker, without adding a limit override
      return getQueryOrSlug(q.query_id);
    });

    // Wait for all SQL results
    const query_sql_results = await Promise.all(promises);

    // Step 2: Process each raw SQL string
    // --- START: Replace this .reduce() block with the Debugging Version ---
    const query_sql = query_sql_results.reduce((acc, rawSqlResult, i) => {
      const curr_query = queries[i];
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
      if (!curr_query.respect_limit) {
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

  const handleLookMLBlend: () => Promise<{
    success: boolean;
    error?: string;
  }> = async () => {
    let connection_name = first_query_connection;

    // If no first_query_connection, try to get it from lookml_model_explore
    if (!connection_name && queries.length > 0) {
      try {
        const first_query = queries[0];
        const [model, explore] = first_query.explore.id.split("::");
        const model_explore = await sdk.ok(
          sdk.lookml_model_explore({
            lookml_model_name: model,
            explore_name: explore,
          })
        );
        if (model_explore?.connection_name) {
          connection_name = model_explore.connection_name;
        }
      } catch (e) {
        console.error("Failed to get connection from lookml_model_explore:", e);
      }
    }

    if (!connection_name) {
      return {
        success: false,
        error:
          "No connection found for the first query. Please ensure the explore has a valid connection.",
      };
    }

    const connection_meta = await sdk.ok(sdk.connection(connection_name));
    if (!config) {
      console.error("No config available");
      return {
        success: false,
        error:
          "Please configure the extension to use the LookML Blend feature.",
      };
    }
    if (!config.project_name?.length || !config.repo_name?.length) {
      return {
        success: false,
        error: "Configuration error: missing Project Name and Repository Name",
      };
    }
    if (config.access_grants && !config.user_attribute?.length) {
      return {
        success: false,
        error: "Configuration error: missing User Attribute",
      };
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
            field_type: found.type,
          });
        }
      });
    });
    const explore_ids = queries.map((q) => q.explore.id);
    const uuid = Array.from(crypto.getRandomValues(new Uint8Array(13)))
      .map((n) => String.fromCharCode(97 + (n % 26)))
      .join("");
    const payload_connection_name =
      config.collapse_connection && config.collapse_connection_name?.length
        ? config.collapse_connection_name
        : connection_meta.name || "";
    if (!payload_connection_name.length) {
      setError("No connection name found");
      loading.setFalse();
      return {
        success: false,
        error: "No connection name found",
      };
    }
    const payload: IBlendPayload = {
      uuid,
      url: lookerHostData?.hostOrigin,
      fields: fields,
      sql: query_sql,
      explore_ids: explore_ids,
      project_name: config.project_name,
      user_attribute: config.access_grants ? config.user_attribute! : "",
      repo_name: config.repo_name,
      includes: config.includes || "",
      lookml_model: getConnectionModel(
        connection_name,
        config.connection_model_mapping,
        config.collapse_connection,
        config.collapse_connection_model_name
      ),
      connection_name: payload_connection_name,
      user_commit_comment: getUserCommitComment(
        user!,
        config.user_commit_comment || []
      ),
      create_measures: config.create_measures || false,
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
        for (var i = 0; i < EXPLORE_POLL_RETRIES; i++) {
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
            await new Promise((resolve) =>
              setTimeout(resolve, EXPLORE_POLL_DELAY)
            );
          }
        }
        extension.openBrowserWindow(r.body.explore_url, "_blank");
        extension.updateLocation;
        return { success: true };
      } else {
        // @ts-ignore
        setError(r.statusText);
        return {
          success: false,
          error: r.statusText,
        };
      }
    } catch (e) {
      console.error(e);
      setError(String(e));
      return {
        success: false,
        error: String(e),
      };
    }
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
      const result = await handleLookMLBlend();
      if (!result.success) {
        setError(result.error);
      }
      loading.setFalse();
      return;
    }
    if (!first_query_connection) {
      console.error("No connection found");
      setError("No connection found");
      loading.setFalse();
      return;
    }
    const connection_meta = await sdk.ok(
      sdk.connection(first_query_connection)
    );
    const query_sql = await getQuerySql(
      getConnectionDialect(connection_meta),
      search_params.get("b") || ""
    );
    try {
      const create_sql = await sdk.ok(
        sdk.create_sql_query({
          sql: query_sql,
          connection_name: first_query_connection,
        })
      );
      if (create_sql.slug) {
        const _run_sql = await sdk.ok(
          sdk.run_sql_query(create_sql.slug, "json")
        );
        const url = `/extensions/${extension.lookerHostData?.extensionId}/blended/${create_sql.slug}`;
        extension.openBrowserWindow(url, "_blank");
      } else {
        setError("Failed to create SQL query");
      }
    } catch (e) {
      console.error(e);
      setError(
        "Failed to create SQL query, do you have permission to run SQL queries in Looker?"
      );
      loading.setFalse();
      return;
    }
    loading.setFalse();
  };


  return (
    <SpaceVertical width="100%" gap="xsmall">
      {error && <Label>{error}</Label>}
      <Space align="center" gap="small">
        {" "}
        <LoadingButton
          is_loading={loading.value}
          onClick={() => setToggle("blend")}
        >
          Blend
        </LoadingButton>
        {/* Icons - should now align with the Button in this row */}
        <IconButton
          size="medium"
          onClick={() => setToggle("sql")}
          icon={<JoinInner color={invalid_joins ? theme.colors.critical : undefined} size={24} />}
          label={invalid_joins_text}
        />
      </Space>
      {/* --- End ROW 2 --- */}

      {/* Dialog remains outside this main layout structure */}
      {toggle && (
        <BlendDialog
          onClose={() => setToggle(false)}
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
    </SpaceVertical>
  );
};

const BlendButtonWrapper = () => {
  return <BlendButtonProvider>
    <BlendButton />
  </BlendButtonProvider>
}

export default BlendButtonWrapper