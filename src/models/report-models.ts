
export interface ComparisonReport {
    tables: ReportTable[],
    storedProcedures: any[],
    triggers: any[];
}

export interface ReportTable extends ComparisonReportItem {
    name: string,
    actualAst: any | null;
    expectedAst: any | null;
}

export interface ComparisonReportItem {
    problems: Problem[];
}

export interface Problem {
    problemText: string;
    problemType: 'missing' | 'not expected' | 'differs';
}