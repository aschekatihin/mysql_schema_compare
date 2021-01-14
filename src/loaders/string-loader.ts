import chalk = require('chalk');
import * as _ from 'lodash';
import * as util from 'util';

import * as parser from '../generated/pegjs-parser';
import { ParsingResult, SchemaItem, CombinedParsingResult } from "../models/common-models";

const inspectSettings = { colors: false, compact: false, showHidden: false, depth: null };

function unifyTablePks(tableItem: SchemaItem) {
    const pkColumns = tableItem.ast.definitions.filter(i => i.def_type === 'column' && i.is_pk);
    const tablePk = tableItem.ast.definitions.find(i => i.def_type === 'primary_key');

    if (!tablePk) {
        tableItem.ast.definitions.push({def_type: 'primary_key', columns: [ ...pkColumns.map(i => ({ name: i.name, length: null, order: 'ASC' })) ] });
    }
}

function addExplicitDefaultValuesIfNotSet(tableItem: SchemaItem): void {
    const columns = tableItem.ast.definitions.filter(i => i.def_type === 'column' && i.nullable && !i.def_val);

    if (columns) {
        for(const item of columns) {
            item.def_val = { "is_null": true, "value": null };;
        }
    }
}

function addExplicitWidthIfNotSet(tableItem: SchemaItem): void {
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
                    column.datatype.width = column.datatype.is_unsigned ? 20 : 20;
                    break;
        
                case 'bool':
                case 'boolean':
                    column.datatype = { width: 1, type: 'tinyint', is_unsigned: false };
                    break;

                case 'bit':
                    column.datatype.width = 1;
                    break;
                    
                case 'smallint':
                    column.datatype.width = column.datatype.is_unsigned ? 5 : 6;
                    break;

                case 'mediumint':
                    column.datatype.width = column.datatype.is_unsigned ? 8 : 9;
                    break;
            }
        }
    }
}

function addKeyPartExplicitOrderIfNotSet(tableItem: SchemaItem) {
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

function addIndexForForeignKey(tableItem: SchemaItem) {
    const foreignKeys = tableItem.ast.definitions.filter(i => i.def_type === 'foreign_key');
    const indexes = tableItem.ast.definitions.filter(i => i.def_type === 'index' ||
                                                            i.def_type === 'unique_index' ||
                                                            i.def_type === 'primary_key');

    if (!foreignKeys) {
        return;
    }

    for(const item of foreignKeys) {
        const keyColumns = item.ref_columns;

        // mysql reuses index only if FK's column is first in the list of index
        const keyColumnsWithNoIndex = keyColumns.filter(fk => 
            indexes.find(i => {
                const matchingColumn = i.columns.find(c => c.name.localeCompare(fk, { sensitivity: 'base' }) === 0);

                if (matchingColumn) {
                    const index = i.columns.indexOf(matchingColumn);
                    return index === 0;
                } else {
                    return false;
                }
            }
            ) === undefined
        );

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

function applyAlterAddForeignKey(change, tableItem: SchemaItem) {
    const newFk = {
        def_type: 'foreign_key',
        ref_columns: [
            ...change.ref_columns
        ],
        ref_table_name: change.ref_table_name,
        ref_keys: [
            ...change.ref_keys
        ],
        ref_actions: [
            ...change.ref_actions
        ]
    }

    tableItem.ast.definitions.push(newFk);
}

function applyAlterTable(item, resultTransport: CombinedParsingResult) {
    const tableName = item.name;
    const matchingTable = resultTransport.tables.asHash[tableName];

    if (!matchingTable) {
        throw new Error(`Alter table \`${tableName}\` encountered but corresponding table not found`);
    }

    let addedFk = false;
    for(const change of item.changes) {
        switch(change['alt_type']) {
            case 'add_foreign_key':
                applyAlterAddForeignKey(change, matchingTable);
                addedFk = true;
                break;
        }
    }

    if (addedFk) {
        addIndexForForeignKey(matchingTable);
    }
}

const supportedSchemaItems: string[] = ['table', 'trigger', 'procedure', 'function', 'view'];

export function readStringSchemaDefinition(definition: string, resultTransport: CombinedParsingResult): void {
    const ast = parser.parse(definition);
    
    for(const item of ast) {
        if (_.isNil(item['type'])) {
            console.log('There is an item with item.type = null, skipping');
            continue;
        }

        switch (item.type) {
            case 'create_schema_item':
                if (supportedSchemaItems.indexOf(item.schema_item) === -1) {
                    continue;
                }

                const newItem = { 
                    itemName: item.name, 
                    ast: item, 
                    schemaItemType: item.schema_item, 
                    createScript: null
                };

                if (item.schema_item === 'table') {
                    unifyTablePks(newItem);
                    addExplicitDefaultValuesIfNotSet(newItem);
                    addExplicitWidthIfNotSet(newItem);
                    addKeyPartExplicitOrderIfNotSet(newItem);
                    addIndexForForeignKey(newItem);

                    resultTransport.tables.asArray.push(newItem);
                    resultTransport.tables.asHash[newItem.itemName] = newItem;
                } else if (item.schema_item === 'trigger') {
                    resultTransport.triggers.asArray.push(newItem);
                    resultTransport.triggers.asHash[newItem.itemName] = newItem;
                } else if (item.schema_item === 'procedure') {
                    resultTransport.procedures.asArray.push(newItem);
                    resultTransport.procedures.asHash[newItem.itemName] = newItem;
                } else if (item.schema_item === 'function') {
                    resultTransport.functions.asArray.push(newItem);
                    resultTransport.functions.asHash[newItem.itemName] = newItem;
                } else if (item.schema_item === 'view') {
                    resultTransport.views.asArray.push(newItem);
                    resultTransport.views.asHash[newItem.itemName] = newItem;
                } else {
                    console.log(chalk.red('Unhandled item', item.schema_item));
                }
                break;

            case 'alter_table':
                // circular foreign keys are added as alter statement
                // console.log('alter_table', util.inspect(item, inspectSettings));
                applyAlterTable(item, resultTransport);
                break;

            case 'use_database':
                // console.log('found', 'use_database', ', ignoring');
                break;

            default:
                // ignore
                break;
        }
    }
}
