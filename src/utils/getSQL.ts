import { Looker40SDK } from '@looker/sdk';
import { format } from 'prettier-sql';
import { getConnectionDialect } from '.';
import { STATUS_MESSAGES } from './getBlend';

const getJoinTypeSql = (join_type: TJoinType) => {
    const joins = {
        inner: 'INNER JOIN',
        left: 'LEFT JOIN',
        right: 'RIGHT JOIN',
        full: 'FULL JOIN',
        cross: 'CROSS JOIN',
    };
    return joins[join_type];
};

const getJoinSql = (
    join: IQueryJoin,
    dialect: string,
    aliases: { [key: string]: string }
) => {
    let sql = `${getJoinTypeSql(join.type)} ${aliases[join.to_query_id]} ON `;
    join.joins.forEach((j, i) => {
        sql += `${fieldGetter(
            j.from_query_id,
            { id: j.from_field },
            dialect,
            aliases
        )} = ${fieldGetter(
            j.to_query_id,
            { id: j.to_field },
            dialect,
            aliases
        )}`;
        if (i < join.joins.length - 1) {
            sql += '\nAND ';
        }
    });
    return sql;
};

export const fieldTransform = (
    uuid: string,
    field: Pick<IQuery['fields'][number], 'id'>,
    dialect: string,
    aliases: { [key: string]: string }
) => {
    const alias = aliases[uuid];
    if (dialect === 'bigquery_standard_sql') {
        return `${alias}_${field.id.replace('.', '_')}`;
    }
    return `"${alias}.${field.id}"`;
};

const fieldGetter = (
    uuid: string,
    field: Pick<IQuery['fields'][number], 'id'>,
    dialect: string,
    aliases: { [key: string]: string }
) => {
    if (dialect === 'bigquery_standard_sql') {
        return `${aliases[uuid]}.${field.id.replace('.', '_')}`;
    }
    return `${aliases[uuid]}."${field.id}"`;
};

const getFieldSelectList = (
    queries: IQuery[],
    dialect: string,
    aliases: { [key: string]: string }
) => {
    return queries
        .map((q) => {
            return q.fields
                .map(
                    (f) =>
                        `${fieldGetter(
                            q.uuid,
                            f,
                            dialect,
                            aliases
                        )} AS ${fieldTransform(q.uuid, f, dialect, aliases)}`
                )
                .join(', ');
        })
        .join(', ');
};

const safeQueryForWith = (sql: string): string => {
    // 1. Trim whitespace from the beginning and end
    let trimmedSql = sql.trim();

    // 2. Remove a potential trailing semicolon.
    // A semicolon inside the parentheses defining a CTE is usually a syntax error.
    if (trimmedSql.endsWith(';')) {
        trimmedSql = trimmedSql.slice(0, -1).trimEnd(); // Remove semicolon and any space before it
    }

    // 3. Wrap the entire potentially complex query in parentheses.
    // This makes it a valid subquery/derived table expression suitable
    // for use as a CTE definition body.
    return `(${trimmedSql})`;
};

const getQuerySql = async (
    sdk: Looker40SDK,
    queries: IQuery[],
    joins: { [key: string]: IQueryJoin },
    connection: string,
    addStatus?: (status: keyof typeof STATUS_MESSAGES, done: boolean) => void
) => {
    const aliases = queries.reduce((acc, q) => {
        acc[q.uuid] = q.alias || q.uuid;
        return acc;
    }, {} as { [key: string]: string });
    const connection_meta = await sdk.ok(sdk.connection(connection));
    const dialect = getConnectionDialect(connection_meta);
    const getQueryOrSlug = async (query_id: string): Promise<string> => {
        // sometimes, looker doesn't like the new string query_id but the slug works.
        try {
            addStatus?.('get_query_sql', false);
            return await sdk.ok(
                sdk.run_query({
                    query_id: query_id,
                    result_format: 'sql',
                })
            );
        } catch (e) {
            console.error(e);
        }

        try {
            const q4s = await sdk.ok(sdk.query_for_slug(query_id));
            if (q4s.id) {
                const run = await sdk.ok(
                    sdk.run_query({
                        query_id: q4s.id,
                        result_format: 'sql',
                    })
                );
                addStatus?.('get_query_sql', true);
                return run;
            }
        } catch (e) {
            console.error(e);
        }

        return `-- INVALID_QUERY_ID: ${query_id}, couldn't generate SQL. Please contact your looker administrator.`;
    };

    const querySQL = async (dialect: string, b_query_param: string) => {
        // Step 1: Fetch SQL from Looker SDK for each query
        const promises = queries.map((q) => {
            // Fetch the SQL as defined in Looker, without adding a limit override
            return getQueryOrSlug(q.query_id);
        });

        // Wait for all SQL results
        const query_sql_results = await Promise.all(promises);

        // Step 2: Process each raw SQL string
        const query_sql = query_sql_results.reduce((acc, rawSqlResult, i) => {
            const curr_query = queries[i];
            const queryId = queries[i].query_id;

            // Start processing
            let processedSql = rawSqlResult.trim();

            // Step 1: Remove Metadata Query Block
            processedSql = processedSql
                .replace(/-- sql for creating the total[\s\S]*$/i, '')
                .trim();

            // Step 2: Remove Trailing ORDER BY Clause
            // Matches ORDER BY followed by typical column/number/direction lists, until the end. Less greedy.
            processedSql = processedSql
                .replace(
                    /\sORDER\s+BY\s+[a-zA-Z0-9_.,\s()'"\-\`\[\]]+(?: ASC| DESC)?\s*$/i,
                    ''
                )
                .trim();

            // Step 3: Conditional Limit Removal
            if (!curr_query.respect_limit) {
                processedSql = processedSql
                    .replace(/LIMIT\s+\d+\s*$/i, '')
                    .trim();
                processedSql = processedSql
                    .replace(
                        /FETCH\s+(NEXT|FIRST)\s+\d+\s+ROWS?\s+ONLY\s*$/i,
                        ''
                    )
                    .trim();
            }

            // Final Checks & Assignment
            processedSql = processedSql.trim();
            if (!processedSql) {
                console.warn(
                    `Query ${queryId} (Index: ${i}) resulted in empty SQL after processing. Raw SQL was:\n${rawSqlResult}`
                );
                processedSql = '-- Error: Processed SQL was empty';
            }

            return {
                ...acc,
                [queries[i].uuid]: processedSql,
            };
        }, {} as { [key: string]: string });

        // Step 3: Construct the final blended SQL query (Structure remains the same)
        const new_sql = `
${b_query_param?.length ? `-- b=${b_query_param}` : ''}
WITH ${`${queries
            .map(
                (q, i) =>
                    // safeQueryForWith wraps the CLEANED SQL in parentheses
                    `${q.alias || q.uuid} AS ${safeQueryForWith(
                        query_sql[q.uuid as keyof typeof query_sql]
                    )}${i < queries.length - 1 ? ',' : ''}`
            )
            .join('\n')}`}
SELECT ${getFieldSelectList(queries, dialect, aliases)} FROM ${
            aliases[queries[0].uuid]
        }
${queries
    .slice(1)
    .map((q) => {
        const j = joins[q.uuid as keyof typeof joins];
        if (j) {
            return getJoinSql(j, dialect, aliases);
        }
        return null;
    })
    .filter(Boolean)
    .join('\n')}`;

        return format(new_sql, { language: 'sql' });
    };
    const b_query_param = new URLSearchParams(window.location.search).get('b');
    return querySQL(dialect, b_query_param || '');
};

export default getQuerySql;
