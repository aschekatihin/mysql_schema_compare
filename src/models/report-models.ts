
export interface ComparisonReport {
    tables: ComparisonReportItem[];
    storedProcedures: ComparisonReportItem[];
    triggers: ComparisonReportItem[];
    functions: ComparisonReportItem[];
}

export interface ComparisonReportItem {
    name: string;
    problems: Problem[];
    actualAst: any | null;
    expectedAst: any | null;
}

export interface Problem {
    problemText: string;
    problemType: 'missing' | 'not expected' | 'differs';
}