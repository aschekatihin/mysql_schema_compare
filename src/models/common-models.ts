
export interface Hash<T> {
    [key: string]: T;
}

export interface CombinedParsingResult {
    tables: ParsingResult;
    triggers: ParsingResult;
    procedures: ParsingResult;
    functions: ParsingResult;
}

export interface ParsingResult {
    asHash: Hash<SchemaItem>;
    asArray: SchemaItem[];
}

export interface SchemaItem {
    createScript: string | null;
    itemName: string;
    ast: any;
    schemaItemType: SchemaItemType;
}

export type StatementType = 'drop_schema_item' | 'use_database' | 'create_schema_item' | 'alter_schema_item';
export type SchemaItemType = 'table' | 'procedure' | 'trigger' | string;

export interface AstTableDefinition {
    name: string;
    definitions: any[],
    options: {};
}

export interface ActualTriggerEntry {
    name: string;
    event: string;
    table: string;
    order: number;
    condition: string;
    statement: string;
    orientation: string;
    timing: string;
}

export interface ActualStoredProcedure {
    name: string;
    type: string;
    bodyType: string;
    definition: string;
}