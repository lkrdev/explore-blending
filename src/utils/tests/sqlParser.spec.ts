import { describe, expect, it } from '@jest/globals';
import { SQLParser } from '../getSQL';

describe('Snowflake SQLParser', () => {
    it('should parse 1 PDT 1 TOtal SQL', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the total and/or determining pivot columns
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
    `.tw();

        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one`.tw(),
            ],
            total: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY`.tw(),
            row_totals: '',
            grand_total: '',
            pivot: '',
            select: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
        `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });

    it('should parse no pdts', () => {
        const IN = `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
        `.tw();
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual({
            pdts: [],
            total: '',
            row_totals: '',
            grand_total: '',
            pivot: '',
            select: IN,
        });
    });

    it('should parse 1 PDT 1 TOtal SQL 1 Row Total SQL', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the total and/or determining pivot columns
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the pivot row totals
SELECT
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
FETCH NEXT 30000 ROWS ONLY

-- sql for creating the grand totals
SELECT
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
FETCH NEXT 1 ROWS ONLY
`.tw();
        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
`.tw(),
            ],
            total: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY`.tw(),
            row_totals: `
SELECT
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
FETCH NEXT 30000 ROWS ONLY`.tw(),
            grand_total: `
SELECT
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
FETCH NEXT 1 ROWS ONLY`.tw(),
            pivot: '',
            select: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
            `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });

    it('should parse 2 PDTs no totals no pivots', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS (
SELECT '2' as one )
-- finished select_two => LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two
SELECT
    select_one.one AS "select_one.one",
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1,
    2
ORDER BY
    1
FETCH NEXT 500 ROWS ONLY
        `.tw();
        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
`.tw(),
                `
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS (
SELECT '2' as one )
-- finished select_two => LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two
`.tw(),
            ],
            total: '',
            row_totals: '',
            grand_total: '',
            pivot: '',
            select: `
SELECT
    select_one.one AS "select_one.one",
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1,
    2
ORDER BY
    1
FETCH NEXT 500 ROWS ONLY
            `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });

    it('should parse 2 pdts, total, row total, pivots, backticks', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS (
SELECT '1' as one )
-- finished select_one => \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\`
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS (
SELECT '2' as one )
-- finished select_two => \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\`
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank

-- sql for creating the total and/or determining pivot columns
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the pivot row totals
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY

-- sql for creating the grand totals
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw();
        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS (
SELECT '1' as one )
-- finished select_one => \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\`
`.tw(),
                `
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS (
SELECT '2' as one )
-- finished select_two => \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\`
`.tw(),
            ],
            total: `
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
        `.tw(),
            row_totals: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY
        `.tw(),
            grand_total: `
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw(),
            pivot: `
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank
        `.tw(),
            select: `
SELECT
    select_one.one AS "select_one.one",
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM \`bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one\` AS select_one
CROSS JOIN \`bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two\` AS select_two
GROUP BY
    1,
    2
ORDER BY
    1
FETCH NEXT 500 ROWS ONLY
        `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });
    it('should parse 2 pdts, total, row total, pivots, double quotes', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS (
SELECT '1' as one )
-- finished select_one => "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one"
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS (
SELECT '2' as one )
-- finished select_two => "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two"
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank

-- sql for creating the total and/or determining pivot columns
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the pivot row totals
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY

-- sql for creating the grand totals
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw();
        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS (
SELECT '1' as one )
-- finished select_one => "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one"
`.tw(),
                `
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS (
SELECT '2' as one )
-- finished select_two => "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two"
`.tw(),
            ],
            total: `
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
        `.tw(),
            row_totals: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY
        `.tw(),
            grand_total: `
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw(),
            pivot: `
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank
        `.tw(),
            select: `
SELECT
    select_one.one AS "select_one.one",
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM "bq-project.LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one" AS select_one
CROSS JOIN "bq-project.LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two" AS select_two
GROUP BY
    1,
    2
ORDER BY
    1
FETCH NEXT 500 ROWS ONLY
        `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });
    it('should parse 2 pdts, total, row total, pivots', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS (
SELECT '2' as one )
-- finished select_two => LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank

-- sql for creating the total and/or determining pivot columns
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY

-- sql for creating the pivot row totals
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY

-- sql for creating the grand totals
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw();
        const OUT = {
            pdts: [
                `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one
`.tw(),
                `
-- generate derived table select_two
-- Building persistent derived table snowflake_test::select_two in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS (
SELECT '2' as one )
-- finished select_two => LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two
`.tw(),
            ],
            total: `
SELECT
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 50 ROWS ONLY
        `.tw(),
            row_totals: `
SELECT
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1
ORDER BY
    1
FETCH NEXT 30000 ROWS ONLY
        `.tw(),
            grand_total: `
SELECT
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
FETCH NEXT 1 ROWS ONLY
        `.tw(),
            pivot: `
SELECT * FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY z___min_rank) as z___pivot_row_rank, RANK() OVER (PARTITION BY z__pivot_col_rank ORDER BY z___min_rank) as z__pivot_col_ordering, CASE WHEN z___min_rank = z___rank THEN 1 ELSE 0 END AS z__is_highest_ranked_cell FROM (
SELECT *, MIN(z___rank) OVER (PARTITION BY "select_one.one") as z___min_rank FROM (
SELECT *, RANK() OVER (ORDER BY "select_one.one" ASC, z__pivot_col_rank) AS z___rank FROM (
SELECT *, DENSE_RANK() OVER (ORDER BY CASE WHEN "select_two.two" IS NULL THEN 1 ELSE 0 END, "select_two.two") AS z__pivot_col_rank FROM (
SELECT
    select_two.two AS "select_two.two",
    select_one.one AS "select_one.one",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1,
    2) ww
) bb WHERE z__pivot_col_rank <= 16384
) aa
) xx
) zz
 WHERE (z__pivot_col_rank <= 50 OR z__is_highest_ranked_cell = 1) AND (z___pivot_row_rank <= 500) ORDER BY z___pivot_row_rank
        `.tw(),
            select: `
SELECT
    select_one.one AS "select_one.one",
    select_two.two AS "select_two.two",
    COUNT(*) AS "select_one.count",
    COUNT(DISTINCT select_two.two) AS "select_two.count"
FROM LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS select_one
CROSS JOIN LOOKER_SCRATCH.LR$ZKOFX1763534613040_select_two AS select_two
GROUP BY
    1,
    2
ORDER BY
    1
FETCH NEXT 500 ROWS ONLY
        `.tw(),
        };
        const parser = new SQLParser(IN);
        expect(parser.parse()).toEqual(OUT);
    });
});
