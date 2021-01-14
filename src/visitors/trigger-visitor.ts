import * as chalk from 'chalk';
import * as jsdiff from 'diff';
import { reportDiffs as reportBodyDiffs } from '../body-diff';

import { ComparisonReportItem } from "../models/report-models";

export function visit(report: ComparisonReportItem): void {
    var diff = jsdiff.diffLines(report.expectedAst.body, report.actualAst.body, { ignoreWhitespace: true, newlineIsToken: false });

    if (diff && diff.length > 0) {
        reportBodyDiffs(diff, report);
    }

    if (report.expectedAst.event !== report.actualAst.event) {
        report.problems.push({
            problemText: `Trigger's ${chalk.cyan(report.name)} actual event ${report.actualAst.event} doesn't matches expected ${report.expectedAst.event}`,
            problemType: 'differs'
        });
    }

    if (report.expectedAst.table_name !== report.actualAst.table_name) {
        report.problems.push({
            problemText: `Trigger's ${chalk.cyan(report.name)} actual event ${report.actualAst.table_name} doesn't matches expected ${report.expectedAst.table_name}`,
            problemType: 'differs'
        });
    }

    if (report.expectedAst.time !== report.expectedAst.time) {
        report.problems.push({
            problemText: `Trigger's ${chalk.cyan(report.name)} actual event ${report.actualAst.time} doesn't matches expected ${report.expectedAst.time}`,
            problemType: 'differs'
        });
    }
}
