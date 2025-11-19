import { describe, expect, it } from '@jest/globals';
import { getPDTMeta, replaceSelectWithPdtView, TPDTMeta } from '../getPDTMeta';

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

describe('getPDTMeta', () => {
    it('should return pdt meta (dev)', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one in dev mode on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one`.tw();
        const OUT = {
            connection_registration_key: 'ZK',
            model: 'snowflake_test',
            view: 'select_one',
            scratch_schema: 'LOOKER_SCRATCH',
            built_pdt_lr: 'LR$ZKWYB1763531790092_select_one',
            built_pdt_lc: 'LC$ZKWYB1763531790092_select_one',
            stable_pdt_view_name: 'LOOKER_SCRATCH.ZK_snowflake_test_select_one',
            project: '',
            encapsulator: '',
        };
        expect(getPDTMeta(IN)).toEqual(OUT);
    });
    it('should return pdt meta (prod)', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LR$ZKWYB1763531790092_select_one`.tw();
        const OUT = {
            connection_registration_key: 'ZK',
            model: 'snowflake_test',
            view: 'select_one',
            scratch_schema: 'LOOKER_SCRATCH',
            built_pdt_lr: 'LR$ZKWYB1763531790092_select_one',
            built_pdt_lc: 'LC$ZKWYB1763531790092_select_one',
            stable_pdt_view_name: 'LOOKER_SCRATCH.ZK_snowflake_test_select_one',
            project: '',
            encapsulator: '',
        };
        expect(getPDTMeta(IN)).toEqual(OUT);
    });
    it('should return pdt meta (lc, reg)', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LC$AAWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LC$AAWYB1763531790092_select_one`.tw();
        const OUT = {
            connection_registration_key: 'AA',
            model: 'snowflake_test',
            view: 'select_one',
            scratch_schema: 'LOOKER_SCRATCH',
            built_pdt_lr: 'LR$AAWYB1763531790092_select_one',
            built_pdt_lc: 'LC$AAWYB1763531790092_select_one',
            stable_pdt_view_name: 'LOOKER_SCRATCH.AA_snowflake_test_select_one',
            project: '',
            encapsulator: '',
        };
        expect(getPDTMeta(IN)).toEqual(OUT);
    });
    it('should return pdt meta (no $, use _)', () => {
        const IN = `
-- generate derived table select_one
-- Building persistent derived table snowflake_test::select_one on instance d4a546a52566484226c5db189db88551
CREATE TABLE LOOKER_SCRATCH.LC_AAWYB1763531790092_select_one AS (
SELECT '1' as one )
-- finished select_one => LOOKER_SCRATCH.LC_AAWYB1763531790092_select_one`.tw();
        const OUT = {
            connection_registration_key: 'AA',
            model: 'snowflake_test',
            view: 'select_one',
            scratch_schema: 'LOOKER_SCRATCH',
            built_pdt_lr: 'LR_AAWYB1763531790092_select_one',
            built_pdt_lc: 'LC_AAWYB1763531790092_select_one',
            stable_pdt_view_name: 'LOOKER_SCRATCH.AA_snowflake_test_select_one',
            project: '',
            encapsulator: '',
        };
        expect(getPDTMeta(IN)).toEqual(OUT);
    });
});

describe('replaceSelectWithPdtView', () => {
    it('should replace pdt view', () => {
        const META_IN = {
            connection_registration_key: 'AA',
            model: 'a',
            view: 'b',
            scratch_schema: 'LOOKER_SCRATCH',
            built_pdt_lr: 'LR$AA1234567890_select_one',
            built_pdt_lc: 'LC$AA1234567890_select_one',
            stable_pdt_view_name: 'LOOKER_SCRATCH.AA_a_b',
            project: '',
            encapsulator: '',
        } as TPDTMeta;
        const IN = `
SELECT * FROM LOOKER_SCRATCH.LR$AA1234567890_select_one`.tw();
        const OUT = `
SELECT * FROM LOOKER_SCRATCH.AA_a_b`.tw();
        expect(replaceSelectWithPdtView(IN, [META_IN])).toEqual(OUT);
    });
    it('should replace pdt view (lc)', () => {
        const META_IN = {
            connection_registration_key: 'AA',
            model: 'a',
            view: 'b',
            scratch_schema: 'c',
            built_pdt_lr: 'LR$AA1234567890_select_one',
            built_pdt_lc: 'LC$AA1234567890_select_one',
            stable_pdt_view_name: 'c.AA_a_b',
            project: '',
            encapsulator: '',
        } as TPDTMeta;
        const IN = `
SELECT * FROM c.LC$AA1234567890_select_one`.tw();
        const OUT = `
SELECT * FROM c.AA_a_b`.tw();
        expect(replaceSelectWithPdtView(IN, [META_IN])).toEqual(OUT);
    });
    it('should replace pdt view (reg key)', () => {
        const META_IN = {
            connection_registration_key: 'XX',
            model: 'a',
            view: 'b',
            scratch_schema: 'c',
            built_pdt_lr: 'LR$XX1234567890_select_one',
            built_pdt_lc: 'LC$XX1234567890_select_one',
            stable_pdt_view_name: 'c.XX_a_b',
            project: '',
            encapsulator: '',
        } as TPDTMeta;
        const IN = `
SELECT * FROM c.LC$XX1234567890_select_one`.tw();
        const OUT = `
SELECT * FROM c.XX_a_b`.tw();
        expect(replaceSelectWithPdtView(IN, [META_IN])).toEqual(OUT);
    });
});

describe('replaceMultiPDTs', () => {
    it('2 pdts', () => {
        const META_IN = [
            {
                connection_registration_key: 'XX',
                model: 'a',
                view: 'b',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_one',
                built_pdt_lc: 'LC$XX1234567890_select_one',
                stable_pdt_view_name: 'c.XX_a_b',
                project: '',
                encapsulator: '',
            },
            {
                connection_registration_key: 'XX',
                model: 'x',
                view: 'y',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_two',
                built_pdt_lc: 'LC$XX1234567890_select_two',
                stable_pdt_view_name: 'c.XX_x_y',
                project: '',
                encapsulator: '',
            },
        ];
        const IN = `
SELECT * FROM c.LC$XX1234567890_select_one
INNER JOIN c.LC$XX1234567890_select_two ON 1=1`.tw();
        const OUT = `
SELECT * FROM c.XX_a_b
INNER JOIN c.XX_x_y ON 1=1`.tw();
        expect(replaceSelectWithPdtView(IN, META_IN)).toEqual(OUT);
    });
    it('2 pdts BQ double quotes', () => {
        const META_IN = [
            {
                connection_registration_key: 'XX',
                model: 'a',
                view: 'b',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_one',
                built_pdt_lc: 'LC$XX1234567890_select_one',
                stable_pdt_view_name: 'c.XX_a_b',
                project: 'bq-project',
                encapsulator: '"',
            },
            {
                connection_registration_key: 'XX',
                model: 'x',
                view: 'y',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_two',
                built_pdt_lc: 'LC$XX1234567890_select_two',
                stable_pdt_view_name: 'c.XX_x_y',
                project: 'bq-project',
                encapsulator: '"',
            },
        ];
        const IN = `
SELECT * FROM "bq-project.c.LC$XX1234567890_select_one"
INNER JOIN "bq-project.c.LC$XX1234567890_select_two" ON 1=1`.tw();
        const OUT = `
SELECT * FROM "bq-project.c.XX_a_b"
INNER JOIN "bq-project.c.XX_x_y" ON 1=1`.tw();
        expect(replaceSelectWithPdtView(IN, META_IN)).toEqual(OUT);
    });
    it('2 pdts BQ backticks', () => {
        const META_IN = [
            {
                connection_registration_key: 'XX',
                model: 'a',
                view: 'b',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_one',
                built_pdt_lc: 'LC$XX1234567890_select_one',
                stable_pdt_view_name: 'c.XX_a_b',
                project: 'bq-project',
                encapsulator: '`',
            },
            {
                connection_registration_key: 'XX',
                model: 'x',
                view: 'y',
                scratch_schema: 'c',
                built_pdt_lr: 'LR$XX1234567890_select_two',
                built_pdt_lc: 'LC$XX1234567890_select_two',
                stable_pdt_view_name: 'c.XX_x_y',
                project: 'bq-project',
                encapsulator: '`',
            },
        ];
        const IN = `
SELECT * FROM \`bq-project.c.LC$XX1234567890_select_one\`
INNER JOIN \`bq-project.c.LC$XX1234567890_select_two\` ON 1=1`.tw();
        const OUT = `
SELECT * FROM \`bq-project.c.XX_a_b\`
INNER JOIN \`bq-project.c.XX_x_y\` ON 1=1`.tw();
        expect(replaceSelectWithPdtView(IN, META_IN)).toEqual(OUT);
    });
});
