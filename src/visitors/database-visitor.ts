import * as _ from 'lodash';
import * as pluralize from 'pluralize';

import { Config } from '../config';
import { ComparisonReport, ComparisonReportItem } from "../models/report-models";
import { ParsingResult, CombinedParsingResult } from "../models/common-models";
import * as tableVisitor from './table-visitor';
import * as procedureVisitor from './stored-procedure-visitor';
import * as triggerVisitor from './trigger-visitor';
import * as viewVisitor from './view-visitor';

function visitSchemaItem(report: ComparisonReport, actual: CombinedParsingResult, expected: CombinedParsingResult, 
    itemVisitor: (report: ComparisonReportItem) => void, schemaItemName: 'table'|'trigger'|'procedure'|'function'|'view'): void {

    const plural = pluralize(schemaItemName);
    detectMissingAndExtra(report, actual[plural], expected[plural], report[plural], schemaItemName);
    compareMatchingItems(report, actual[plural], expected[plural], report[plural], schemaItemName, itemVisitor);
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
                        problemText: _.capitalize(itemTypeText) + ' is present but not expected',
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
                        problemText: _.capitalize(itemTypeText) + ' is not present',
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
    visitSchemaItem(report, actual, expected, tableVisitor.visit, 'table');
    visitSchemaItem(report, actual, expected, triggerVisitor.visit, 'trigger');
    visitSchemaItem(report, actual, expected, procedureVisitor.visit, 'procedure');
    visitSchemaItem(report, actual, expected, procedureVisitor.visit, 'function');
    visitSchemaItem(report, actual, expected, viewVisitor.visit, 'view');
}
