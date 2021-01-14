import * as chalk from 'chalk';
import * as jsdiff from 'diff';

import { ComparisonReportItem } from "../models/report-models";

export function visit(report: ComparisonReportItem): void {
    var diff = jsdiff.diffLines(report.expectedAst.body, report.actualAst.body, { ignoreWhitespace: true, newlineIsToken: false });

    if (diff && diff.length > 0 && diff.find(i => i.added || i.removed) !== undefined) {
        let errorText = '';
        diff.forEach(function(part){
            var color = part.added ? chalk.default.green : (part.removed ? chalk.default.red : chalk.default.gray);
            errorText += color(part.value);
        });

        report.problems.push({
            problemText: `Trigger's ${chalk.default.cyan(report.name)} actual body doesn't matches expected:\n` + errorText,
            problemType: 'differs'
        });
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
