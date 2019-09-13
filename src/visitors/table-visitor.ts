import * as _ from 'lodash';
import * as chalk from 'chalk';

import { AstTableDefinition } from '../models/common-models';
import { ReportTable } from '../models/report-models';
import { Config } from '../config';
import * as utils from '../utils';

export function visit(report: ReportTable): void {
    compareColumns(report);
    compareIndexes(report);
    compareForeignKeys(report);
}

function compareColumns(report: ReportTable) {
    const actualColumns = report.actualAst.definitions.filter(i => i.def_type === 'column');
    const expectedColumns = report.expectedAst.definitions.filter(i => i.def_type === 'column');

    const nameComparison = (fst, sec) => fst.name === sec.name;
    const extra = _.differenceWith(actualColumns, expectedColumns, nameComparison);
    const missing = _.differenceWith(expectedColumns, actualColumns, nameComparison);

    if (extra) {
        for(const extraCol of extra) {
            report.problems.push({
                problemText: `Column ${extraCol.name} is not expected`,
                problemType: 'not expected'
            });
        }
    }

    if (missing) {
        for(const extraCol of missing) {
            report.problems.push({
                problemText: `Column ${chalk.default.blue(extraCol.name)} is expected but not present`,
                problemType: 'missing'
            });
        }
    }

    const matchingNames: string[] = _.intersectionWith(actualColumns, expectedColumns, nameComparison).map(i => i.name);
    const actualColumnsHash = _.keyBy(actualColumns, 'name');
    const expectedColumnsHash = _.keyBy(expectedColumns, 'name');

    for(const colName of matchingNames) {
        if (actualColumnsHash[colName].auto_incr !== expectedColumnsHash[colName].auto_incr) {
            report.problems.push({
                problemText: `Column ${chalk.default.blue(colName)} AUTOINCREMENT flag doesn't matches. Expected: ${expectedColumnsHash[colName].auto_incr}, actual: ${actualColumnsHash[colName].auto_incr}`,
                problemType: 'differs'
            });
        }

        if (actualColumnsHash[colName].nullable !== expectedColumnsHash[colName].nullable) {
            report.problems.push({
                problemText: formatProblemText(colName, 'nullable flag', expectedColumnsHash[colName].nullable, actualColumnsHash[colName].nullable),
                problemType: 'differs'
            });
        }

        if (isDefValueDiffers(actualColumnsHash[colName].def_val, expectedColumnsHash[colName].def_val)) {
            report.problems.push({
                problemText: formatProblemText(colName, 'default value', JSON.stringify(expectedColumnsHash[colName].def_val), 
                    JSON.stringify(actualColumnsHash[colName].def_val)),
                problemType: 'differs'
            });
        }

        const dataTypeDifferences = detectDataTypeChanges(actualColumnsHash[colName].datatype, expectedColumnsHash[colName].datatype);
        if (dataTypeDifferences.length > 0) {
            report.problems.push({
                problemText: formatProblemText(colName, 'data type', JSON.stringify(_.pick(expectedColumnsHash[colName].datatype, dataTypeDifferences)), 
                    JSON.stringify(_.pick(actualColumnsHash[colName].datatype, dataTypeDifferences))),
                problemType: 'differs'
            });
        }
    }
}

function compareIndexes(report: ReportTable) {
    // const mapFunc = i => _.sortBy(i.columns, s => s.name).map(c => `${c.name}(${c.length})${c.order}`).join('-');
    const keypartIndexFilter = i => i.def_type === 'unique_index' || 
                                    i.def_type === 'index' || 
                                    i.def_type === 'primary_key' || 
                                    i.def_type === 'spatial_index' || 
                                    i.def_type === 'fulltext_index';

    const mapFunc = i => ({ hash: i.def_type + '-' + _.sortBy(i.columns, s => s.name).map(c => `${c.name}`).join('-'), original: i});
    const actualKeypartIndexes: any[] = report.actualAst.definitions.filter(keypartIndexFilter).map(mapFunc);
    const expectedKeypartIndexes: any[] = report.expectedAst.definitions.filter(keypartIndexFilter).map(mapFunc);

    const idxNameComparison_ci = (fst, sec) => fst.hash.localeCompare(sec.hash, undefined, { sensitivity: 'base' }) === 0;
    const extra = _.differenceWith(actualKeypartIndexes, expectedKeypartIndexes, idxNameComparison_ci);
    const missing = _.differenceWith(expectedKeypartIndexes, actualKeypartIndexes, idxNameComparison_ci);

    if (extra) {
        for(const extraIdx of extra) {
            report.problems.push({
                problemText: `Index of type ${chalk.default.cyan(extraIdx.original.def_type)} (name: ${extraIdx.original.name}) consisting of columns ${chalk.default.cyan(extraIdx.original.columns.map(c => `${c.name}`).join(','))} is not expected`,
                problemType: 'not expected'
            });
        }
    }

    if (missing) {
        for(const missingIdx of missing) {
            report.problems.push({
                problemText: `Index of type ${missingIdx.original.def_type} (name: ${missingIdx.original.name}) consisting of columns ${chalk.default.cyan(missingIdx.original.columns.map(c => `${c.name}`).join(','))} is expected but not present`,
                problemType: 'missing'
            });
        }
    }

    const matchingKeypartIndexes: string[] = _.intersectionWith(actualKeypartIndexes, expectedKeypartIndexes, (fst, sec) => fst.hash === sec.hash).map(i => i.hash);
    const actualHash = _.keyBy(actualKeypartIndexes, 'hash');
    const expectedHash = _.keyBy(expectedKeypartIndexes, 'hash');

    if (matchingKeypartIndexes.length > 0) {
        for(const item of matchingKeypartIndexes) {
            const actualIndex = actualHash[item];
            const expectedIndex = expectedHash[item];

            if (actualIndex.original.def_type !== expectedIndex.original.def_type) {
                report.problems.push({
                    problemText: `Index with column set ${item} type expected: ${expectedIndex.original.def_type}, actual type: ${actualIndex.original.def_type}`,
                    problemType: 'differs'
                });
            }

            if (!Config.general.ignore_index_names && actualIndex.original.name !== expectedIndex.original.name) {
                report.problems.push({
                    problemText: `Index of type ${actualIndex.original.def_type} name expected ${expectedIndex.original.name}, actually got ${actualIndex.original.name}`,
                    problemType: 'differs'
                });
            }
        }
    }
}

function compareForeignKeys(report) {
    const fkFilter = i => i.def_type === 'foreign_key';
    const mapFunc = i => `${i.ref_table_name}-${i.ref_columns.join('-')}`;
    const actualFks: any[] = report.actualAst.definitions.filter(fkFilter).map(mapFunc);
    const expectedFks: any[] = report.expectedAst.definitions.filter(fkFilter).map(mapFunc);

    
}

function formatProblemText(column: string, what: string, expected: any, actual: any): string {
    return `Column ${chalk.default.blue(column)} ${what} doesn't matches. Expected: ${expected}, actual: ${actual}`;
}

function isDefValueDiffers(actualDefValue: any, expectedDefValue: any): boolean {
    if (_.isNil(actualDefValue) !== _.isNil(expectedDefValue)) {
        return true;
    }

    if (_.isNil(actualDefValue) && _.isNil(expectedDefValue)) {
        return false;
    }

    if (actualDefValue.is_null !== expectedDefValue.is_null) {
        return true;
    }

    if (actualDefValue.value !== expectedDefValue.value) {
        return true;
    }

    return false;
}

function detectDataTypeChanges(actual: any, expected: any): string[] {
    const result = [];

    if (actual.type !== expected.type) {
        result.push('type');
    }

    if (actual.width !== expected.width) {
        result.push('width');
    }

    if (actual.fraction_width !== expected.fraction_width) {
        result.push('fraction_width');
    }

    if (actual.is_unsigned !== expected.is_unsigned) {
        result.push('is_unsigned');
    }

    return result;
}


