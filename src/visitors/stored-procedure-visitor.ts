import * as chalk from 'chalk';
import * as jsdiff from 'diff';

import { ComparisonReportItem } from '../models/report-models';

export function visit(report: ComparisonReportItem): void {
    var diff = jsdiff.diffLines(report.expectedAst.body, report.actualAst.body, { ignoreWhitespace: true, newlineIsToken: false });

    if (diff && diff.length > 0 && diff.find(i => i.added || i.removed) !== undefined) {
        let errorText = '';
        diff.forEach(function(part){
            var color = part.added ? chalk.default.green : (part.removed ? chalk.default.red : chalk.default.gray);
            errorText += color(part.value);
        });

        report.problems.push({
            problemText: `Procedure's ${chalk.default.cyan(report.name)} expected body doesn't matches actual:\n` + errorText,
            problemType: 'differs'
        });
    }
}
