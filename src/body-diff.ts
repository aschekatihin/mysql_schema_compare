import * as chalk from 'chalk';
import * as jsdiff from 'diff';

import { Config } from './config';
import { ComparisonReportItem } from './models/report-models';

export function reportDiffs(diff: jsdiff.Change[], report: ComparisonReportItem) {
    let errorText = '';
    let meaningfulDiffs = 0;

    diff.forEach((part, index) => {
        const partTrimmed = part.value?.trim();
        const isComment = partTrimmed.startsWith('--') || (partTrimmed.startsWith('/*') && partTrimmed.endsWith('*/'));
        const isEmptyLine = partTrimmed === '';

        if (!Config.general.full_diffs && (!(part.added || part.removed) || isEmptyLine)) {
            return;
        }

        if (!(isComment || isEmptyLine) && (part.added || part.removed)) {
            meaningfulDiffs++;
        }

        if (isComment && Config.general.ignore_comments) {
            return;
        }

        var color = part.added ? chalk.green : (part.removed ? chalk.red : chalk.gray);

        if (Config.general.full_diffs) {
            errorText += color(part.value);    
        } else {
            const previousUnchanged = index > 0 ? diff.find((val, idx) => !val.added && !val.removed && idx < index) : null;
            const nextUnchanged = diff.find((val, idx) => !val.added && !val.removed && idx > index);

            if (index > 0 && previousUnchanged && !(diff[index-1].added || diff[index-1].removed)) {
                errorText += chalk.gray('\n...\n');
                errorText += chalk.gray(previousUnchanged.value);
            }
            
            errorText += color(part.value);

            if (nextUnchanged && index < diff.length-1 && !(diff[index+1]?.added || diff[index+1]?.removed)) {
                errorText += chalk.gray(nextUnchanged.value);
                errorText += chalk.gray('\n...\n');
            }
        }
    });

    if (meaningfulDiffs > 0) {
        report.problems.push({
            problemText: `Procedure's ${chalk.cyan(report.name)} expected body doesn't matches actual:\n` + errorText,
            problemType: 'differs'
        });
    }
}
