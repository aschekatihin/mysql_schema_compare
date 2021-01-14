import * as jsdiff from 'diff';

import { ComparisonReportItem } from '../models/report-models';
import { reportDiffs } from '../body-diff';

export function visit(report: ComparisonReportItem): void {
    var diff = jsdiff.diffLines(report.expectedAst.body, report.actualAst.body, { ignoreWhitespace: true, newlineIsToken: false });

    if (!diff || diff.length === 0) {
        return;
    }

    reportDiffs(diff, report);
}
