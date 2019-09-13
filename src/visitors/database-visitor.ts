import * as _ from 'lodash';

import { Config } from '../config';
import { ComparisonReport, ReportTable } from "../models/report-models";
import { ParsingResult } from "../models/common-models";
import * as tableVisitor from './table-visitor';

export function visit(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult): void {
    const extra = _.differenceWith(actual.asArray, expected.asArray, (fst, sec) => fst.itemName === sec.itemName);
    const missing = _.differenceWith(expected.asArray, actual.asArray, (fst, sec) => fst.itemName === sec.itemName);

    // console.log('extra:', extraNames, 'missing', missingNames);
    if (extra.length > 0 && Config.general.warn_if_extra_tables) {
        for(const item of extra) {
            const newReportItem: ReportTable = {
                name: item.itemName,
                actualAst: item.ast,
                expectedAst: null,
                problems: [
                    {
                        problemText: 'Table is present but not expected',
                        problemType: 'not expected'
                    }
                ]
            };

            report.tables.push(newReportItem);
        }
    }

    if (missing.length > 0) {
        for(const item of missing) {
            const newReportItem: ReportTable = {
                name: item.itemName,
                actualAst: null,
                expectedAst: item.ast,
                problems: [
                    {
                        problemText: 'Table is not present',
                        problemType: 'missing'
                    }
                ]
            };

            report.tables.push(newReportItem);
        }
    }

    const matching = _.intersectionWith(actual.asArray, expected.asArray, (fst, sec) => fst.itemName === sec.itemName);

    for(const table of matching) {
        const tableReportItem: ReportTable =  {
            actualAst: actual.asHash[table.itemName].ast,
            expectedAst: expected.asHash[table.itemName].ast,
            name: table.itemName,
            problems: []
        };

        report.tables.push(tableReportItem);

        try {
            tableVisitor.visit(tableReportItem);
        }
        catch(e) {
            console.log(`Error while visiting table ${table.itemName}`)

            throw(e);
        }
    }
}