import * as _ from 'lodash';
import * as chalk from 'chalk';
import * as jsdiff from 'diff';

import { ComparisonReportItem } from "../models/report-models";

export function visit(report: ComparisonReportItem): void {
    var diff = jsdiff.diffWordsWithSpace(report.expectedAst.body, report.actualAst.body, { ignoreCase: true, ignoreWhitespace: true });

    if (diff && diff.length > 0 && diff.find(i => i.added || i.removed) !== undefined) {
        let errorText = '';
        let nonCommentDiffs = 0;

        diff.forEach(function(part){
            if (part.value && !part.value.startsWith('--') && part.value !== '' && (part.added || part.removed)) {
                nonCommentDiffs++;
            }

            var color = part.added ? chalk.green : (part.removed ? chalk.red : chalk.gray);
            errorText += color(part.value);
        });

        if (nonCommentDiffs > 0) {
            report.problems.push({
                problemText: `View's ${chalk.cyan(report.name)} expected body doesn't matches actual:\n` + errorText,
                problemType: 'differs'
            });
        }
    }
}
