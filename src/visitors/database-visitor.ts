import * as _ from 'lodash';

import { Config } from '../config';
import { ComparisonReport, ComparisonReportItem } from "../models/report-models";
import { ParsingResult, CombinedParsingResult } from "../models/common-models";
import * as tableVisitor from './table-visitor';
import * as procedureVisitor from './stored-procedure-visitor';
import * as triggerVisitor from './trigger-visitor';

function visitTables(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult): void {
    detectMissingAndExtra(report, actual, expected, report.tables, 'Table');
    compareMatchingItems(report, actual, expected, report.tables, 'table', tableVisitor.visit);
}

function visitTriggers(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult): void {
    detectMissingAndExtra(report, actual, expected, report.triggers, 'Trigger');
    compareMatchingItems(report, actual, expected, report.triggers, 'trigger', triggerVisitor.visit);
}

function visitProcedures(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult): void {
    detectMissingAndExtra(report, actual, expected, report.storedProcedures, 'Stored procedure');
    compareMatchingItems(report, actual, expected, report.storedProcedures, 'stored procedure', procedureVisitor.visit);
}

function visitFunctions(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult): void {
    detectMissingAndExtra(report, actual, expected, report.functions, 'Function');
    compareMatchingItems(report, actual, expected, report.functions, 'function', procedureVisitor.visit);
}

function detectMissingAndExtra(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult, reportTarget: ComparisonReportItem[], itemTypeText: string) {
    const extra = _.differenceWith(actual.asArray, expected.asArray, (fst, sec) => fst.itemName === sec.itemName);
    const missing = _.differenceWith(expected.asArray, actual.asArray, (fst, sec) => fst.itemName === sec.itemName);

    if (extra.length > 0 && Config.general.warn_if_extra_tables) {
        for(const item of extra) {
            const newReportItem: ComparisonReportItem = {
                name: item.itemName,
                actualAst: item.ast,
                expectedAst: null,
                problems: [
                    {
                        problemText: itemTypeText + ' is present but not expected',
                        problemType: 'not expected'
                    }
                ]
            };

            reportTarget.push(newReportItem);
        }
    }

    if (missing.length > 0) {
        for(const item of missing) {
            const newReportItem: ComparisonReportItem = {
                name: item.itemName,
                actualAst: null,
                expectedAst: item.ast,
                problems: [
                    {
                        problemText: itemTypeText + ' is not present',
                        problemType: 'missing'
                    }
                ]
            };

            reportTarget.push(newReportItem);
        }
    }
}

function compareMatchingItems(report: ComparisonReport, actual: ParsingResult, expected: ParsingResult, reportTarget: ComparisonReportItem[], itemTypeText: string,
    itemVisitor: (item: ComparisonReportItem) => void) {
    const matching = _.intersectionWith(actual.asArray, expected.asArray, (fst, sec) => fst.itemName === sec.itemName);
    for(const item of matching) {
        const reportItem: ComparisonReportItem =  {
            actualAst: actual.asHash[item.itemName].ast,
            expectedAst: expected.asHash[item.itemName].ast,
            name: item.itemName,
            problems: []
        };

        reportTarget.push(reportItem);

        try {
            itemVisitor(reportItem);
        }
        catch(e) {
            console.log(`Error while visiting ${itemTypeText} ${item.itemName}`)

            throw(e);
        }
    }
}

export function visit(report: ComparisonReport, actual: CombinedParsingResult, expected: CombinedParsingResult): void {
    visitTables(report, actual.tables, expected.tables);
    visitTriggers(report, actual.triggers, expected.triggers);
    visitProcedures(report, actual.procedures, expected.procedures);
    visitFunctions(report, actual.functions, expected.functions);
}
