import * as _ from 'lodash';

import * as parser from '../generated/pegjs-parser';
import { ParsingResult, SchemaItem } from "../models/common-models";

export class StringLoader {

    public static readStringSchemaDefinition(definition: string): ParsingResult {
        const ast = parser.parse(definition);
        
        const result: { asArray: SchemaItem[], asHash: { [key: string]: SchemaItem }} = { asArray: [], asHash: {} };
    
        for(const item of ast) {
            switch (item.type) {
                case 'create_schema_item':
                    if (item.schema_item !== 'table')
                        continue;

                    const tableItem = { 
                        itemName: item.name, 
                        ast: item, 
                        schemaItemType: item.schema_item, 
                        parsingError: null, 
                        successfullyParsed: true, 
                        createScript: null };

                    StringLoader.unifyTablePks(tableItem);
                    StringLoader.addExplicitDefaultValuesIfNotSet(tableItem);
                    StringLoader.addExplicitWidthIfNotSet(tableItem);
                    StringLoader.addKeyPartExplicitOrderIfNotSet(tableItem);
                    StringLoader.addIndexForForeignKey(tableItem);

                    result.asArray.push(tableItem);
                    result.asHash[tableItem.itemName] = tableItem;
                    break;
    
                case 'alter_schema_item':
                    // circular foreign keys are added as alter statement
                    break;
    
                default:
                    // ignore
                    break;
            }
        }
    
        return result;
    }

    private static unifyTablePks(tableItem: SchemaItem) {
        const pkColumns = tableItem.ast.definitions.filter(i => i.def_type === 'column' && i.is_pk);
        const tablePk = tableItem.ast.definitions.find(i => i.def_type === 'primary_key');

        if (!tablePk) {
            tableItem.ast.definitions.push({def_type: 'primary_key', columns: [ ...pkColumns.map(i => ({ name: i.name, length: null, order: 'ASC' })) ] });
        }
    }

    private static addExplicitDefaultValuesIfNotSet(tableItem: SchemaItem): void {
        const columns = tableItem.ast.definitions.filter(i => i.def_type === 'column' && i.nullable && !i.def_val);

        if (columns) {
            for(const item of columns) {
                item.def_val = { "is_null": true, "value": null };;
            }
        }
    }

    private static addExplicitWidthIfNotSet(tableItem: SchemaItem): void {
        const columns = tableItem.ast.definitions.filter(i => i.def_type === 'column' && _.isNil(i.datatype.width));

        if (columns) {
            for(const column of columns) {
                switch(column.datatype.type) {
                    case 'int':
                        column.datatype.width = column.datatype.is_unsigned ? 10 : 11;
                        break;
            
                    case 'tinyint':
                        column.datatype.width = column.datatype.is_unsigned ? 3 : 4;
                        break;
            
                    case 'bigint':
                        column.datatype.width = column.datatype.is_unsigned ? 21 : 22;
                        break;
            
                    case 'bool':
                    case 'boolean':
                        column.datatype = { width: 1, type: 'tinyint', is_unsigned: false };
                        break;
                }
            }
        }
    }

    private static addKeyPartExplicitOrderIfNotSet(tableItem: SchemaItem) {
        const indexes = tableItem.ast.definitions.filter(i => i.def_type === 'primary_key' || 
                                                                i.def_type === 'index' || 
                                                                i.def_type === 'spatial_index' ||
                                                                i.def_type === 'fulltext_index' || 
                                                                i.def_type === 'unique_index');

        if (indexes) {
            for(const index of indexes) {
                for(const keyPart of index.columns) {
                    if (_.isNil(keyPart.order)) {
                        keyPart.order = 'ASC'
                    }
                }
            }
        }
    }

    private static addIndexForForeignKey(tableItem: SchemaItem) {
        const foreignKeys = tableItem.ast.definitions.filter(i => i.def_type === 'foreign_key');
        const indexes = tableItem.ast.definitions.filter(i => i.def_type === 'index' || i.def_type === 'unique_index');

        if (!foreignKeys) {
            return;
        }

        for(const item of foreignKeys) {
            const keyColumns = item.ref_columns;

            const keyColumnsWithNoIndex = keyColumns.filter(i=> indexes.find(i => i.columns.find(c => c.name.localeCompare()) !== undefined) === undefined);

            if (keyColumnsWithNoIndex.length > 0) {
                const newFkIndex = { 
                    def_type: 'index',
                    name: 'FK_' + keyColumns.join('_'),
                    columns: [ ...keyColumnsWithNoIndex.map(i => ({ name: i, length: null, order: 'ASC'}))]
                };

                tableItem.ast.definitions.push(newFkIndex);
            }
        }
    }

    private static columnPresentInAnyIndex(refColumn: string, indexes: any[]) {
        const matchingIndex = indexes.find(i => i.columns.find(c => c.name.localeCompare(refColumn, undefined, { sensitivity: 'base' }) === 0) !== undefined);
        return matchingIndex !== undefined;
    }
}
