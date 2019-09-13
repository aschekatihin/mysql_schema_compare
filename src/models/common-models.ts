
export interface Hash<T> {
    [key: string]: T;
}

export interface ParsingResult {
    asHash: Hash<SchemaItem>;
    asArray: SchemaItem[];
}

export interface SchemaItem {
    parsingError: any | null;
    successfullyParsed: boolean;
    createScript: string | null;
    itemName: string;
    ast: any;
    schemaItemType: SchemaItemType;
}

export type StatementType = 'drop_schema_item' | 'use_database' | 'create_schema_item' | 'alter_schema_item';
export type SchemaItemType = 'table';

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