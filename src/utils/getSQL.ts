import { Looker40SDK } from '@looker/sdk';
import { format } from 'prettier-sql';
import { getConnectionDialect } from '.';
import { STATUS_MESSAGES } from './getBlend';
import { getPDTMeta, replaceSelectWithPdtView } from './getPDTMeta';

declare global {
    interface String {
        tw(): string;
    }
}

String.prototype.tw = function () {
    const text = this.split('\n');
    const regex = /\s+/g;
    let trimmed = text.reduce((acc, l) => {
        const trimmed = l.trim().replace(regex, ' ');
        if (trimmed?.length) {
            acc.push(trimmed);
        }
        return acc;
    }, [] as string[]);
    return trimmed.join('\n');
};

export class SQLParser {
    sql: string;
    parsed: {
        pdts: string[];
        total: string;
        row_totals: string;
        grand_total: string;
        pivot: string;
        select: string;
    };
    constructor(sql: string) {
        this.sql = this.cleanSql(sql);
        this.parsed = this.parse();
    }

    private cleanSql(sql: string): string {
        return sql.tw();
    }

    private prettySql(sql: string): string {
        return format(sql);
    }

    public replaceWithStableDbView(sql?: string) {
        const s = sql || this.sql;
        const pdt_meta = this.getPdtMeta();
        const new_sql = replaceSelectWithPdtView(s, pdt_meta);
        return this.prettySql(new_sql);
    }

    public parse(sql?: string) {
        const s = sql || this.sql;
        const lines = s.split('\n');
        const pdts: string[] = [];
        let selectLines: string[] = [];
        let totalLines: string[] = [];
        let rowTotalLines: string[] = [];
        let grandTotalLines: string[] = [];
        let currentPdtLines: string[] = [];

        let mode: 'select' | 'pdt' | 'total' | 'row_total' | 'grand_total' =
            'select';

        for (const line of lines) {
            if (line.startsWith('-- generate derived table')) {
                mode = 'pdt';
                currentPdtLines = [line];
                continue;
            }
            if (line.startsWith('-- finished')) {
                currentPdtLines.push(line);
                pdts.push(currentPdtLines.join('\n'));
                mode = 'select';
                continue;
            }
            if (line.startsWith('-- sql for creating the total')) {
                mode = 'total';
                continue;
            }
            if (line.startsWith('-- sql for creating the pivot row totals')) {
                mode = 'row_total';
                continue;
            }
            if (line.startsWith('-- sql for creating the grand totals')) {
                mode = 'grand_total';
                continue;
            }

            if (mode === 'pdt') {
                currentPdtLines.push(line);
            } else if (mode === 'select') {
                selectLines.push(line);
            } else if (mode === 'total') {
                totalLines.push(line);
            } else if (mode === 'row_total') {
                rowTotalLines.push(line);
            } else if (mode === 'grand_total') {
                grandTotalLines.push(line);
            }
        }

        let selectSql = selectLines.join('\n');
        let pivotSql = '';

        // Detect pivot query
        if (selectSql.includes('z__pivot_col_rank')) {
            pivotSql = selectSql;
            // Extract inner query: FROM ( ... ) ww
            // Use a regex that finds the innermost FROM ( ... ) ww block
            // by ensuring the captured group does not contain "FROM ("
            const match = selectSql.match(
                /FROM \(\s*((?:(?!FROM \()[\s\S])+?)\s*\) ww/,
            );
            if (match && match[1]) {
                selectSql = this.cleanSql(match[1]);

                // Extract structural information from the pivot wrapper
                const rowDimMatch = pivotSql.match(
                    /PARTITION BY "([^"]+)"\) as z___min_rank/,
                );
                const colDimMatch = pivotSql.match(
                    /DENSE_RANK\(\) OVER \(ORDER BY .*? "([^"]+)"\) AS z__pivot_col_rank/,
                );
                const limitMatch = pivotSql.match(
                    /z___pivot_row_rank <= (\d+)/,
                );

                const rowDim = rowDimMatch ? rowDimMatch[1] : null;
                const colDim = colDimMatch ? colDimMatch[1] : null;
                const limit = limitMatch ? limitMatch[1] : null;

                // Reorder columns if necessary: Row Dimension should come before Column Dimension
                if (rowDim && colDim) {
                    const lines = selectSql.split('\n');
                    const rowDimIndex = lines.findIndex((l) =>
                        l.includes(`AS "${rowDim}"`),
                    );
                    const colDimIndex = lines.findIndex((l) =>
                        l.includes(`AS "${colDim}"`),
                    );

                    if (
                        rowDimIndex !== -1 &&
                        colDimIndex !== -1 &&
                        colDimIndex < rowDimIndex
                    ) {
                        const temp = lines[colDimIndex];
                        lines[colDimIndex] = lines[rowDimIndex];
                        lines[rowDimIndex] = temp;
                        selectSql = lines.join('\n');
                    }
                }

                // Append ORDER BY and LIMIT based on structural findings
                // If we reordered to put the row dimension first (or it was already first),
                // and the pivot sorts by row rank, we can assume ORDER BY 1.
                if (pivotSql.includes('ORDER BY z___pivot_row_rank')) {
                    if (!selectSql.includes('ORDER BY')) {
                        selectSql += '\nORDER BY\n1';
                    }
                }

                if (limit) {
                    if (!selectSql.includes('FETCH NEXT')) {
                        selectSql += `\nFETCH NEXT ${limit} ROWS ONLY`;
                    }
                }
            }
        }

        return {
            pdts: pdts,
            total: totalLines.join('\n'),
            row_totals: rowTotalLines.join('\n'),
            grand_total: grandTotalLines.join('\n'),
            pivot: pivotSql,
            select: selectSql,
        };
    }

    public getPdtMeta() {
        if (!this.parsed) {
            this.parse();
        }
        const pdts = this.parsed.pdts;
        return pdts.map((pdt) => getPDTMeta(pdt));
    }
}

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
    aliases: { [key: string]: string },
) => {
    let sql = `${getJoinTypeSql(join.type)} ${aliases[join.to_query_id]} ON `;
    join.joins.forEach((j, i) => {
        sql += `${fieldGetter(
            j.from_query_id,
            { id: j.from_field },
            dialect,
            aliases,
        )} = ${fieldGetter(
            j.to_query_id,
            { id: j.to_field },
            dialect,
            aliases,
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
    aliases: { [key: string]: string },
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
    aliases: { [key: string]: string },
) => {
    if (dialect === 'bigquery_standard_sql') {
        return `${aliases[uuid]}.${field.id.replace('.', '_')}`;
    }
    return `${aliases[uuid]}."${field.id}"`;
};

const getFieldSelectList = (
    queries: IQuery[],
    dialect: string,
    aliases: { [key: string]: string },
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
                            aliases,
                        )} AS ${fieldTransform(q.uuid, f, dialect, aliases)}`,
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
    use_stable_db_view: boolean,
    addStatus?: (status: keyof typeof STATUS_MESSAGES, done: boolean) => void,
) => {
    const aliases = queries.reduce((acc, q) => {
        acc[q.uuid] = q.alias || q.uuid;
        return acc;
    }, {} as { [key: string]: string });
    const connection_meta = await sdk.ok(sdk.connection(connection));
    const dialect = getConnectionDialect(connection_meta);
    const tmp_db_name = connection_meta.tmp_db_name;
    const getQueryOrSlug = async (query_id: string): Promise<string> => {
        // sometimes, looker doesn't like the new string query_id but the slug works.
        try {
            addStatus?.('get_query_sql', false);
            const query = await sdk.ok(
                sdk.run_query({
                    query_id: query_id,
                    result_format: 'sql',
                    rebuild_pdts: use_stable_db_view,
                }),
            );
            if (use_stable_db_view) {
                const parsed = new SQLParser(query);
                return parsed.replaceWithStableDbView(parsed.parsed.select);
            } else {
                return query;
            }
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
                        rebuild_pdts: use_stable_db_view,
                    }),
                );
                addStatus?.('get_query_sql', true);
                if (use_stable_db_view) {
                    const parsed = new SQLParser(run);
                    return parsed.replaceWithStableDbView(parsed.parsed.select);
                } else {
                    return run;
                }
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
                    '',
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
                        '',
                    )
                    .trim();
            }

            // Final Checks & Assignment
            processedSql = processedSql.trim();
            if (!processedSql) {
                console.warn(
                    `Query ${queryId} (Index: ${i}) resulted in empty SQL after processing. Raw SQL was:\n${rawSqlResult}`,
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
                        query_sql[q.uuid as keyof typeof query_sql],
                    )}${i < queries.length - 1 ? ',' : ''}`,
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
