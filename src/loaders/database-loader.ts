import * as fs from 'fs';
import * as util from 'util';

import mysqlPromise from "../mysql-promise";
import { SchemaItem, ActualTriggerEntry, ActualStoredProcedure, CombinedParsingResult } from "../models/common-models";
import * as StringLoader from "./string-loader";
import { Config } from '../config';

async function getTablesNames(): Promise<string[]> {
    const tables: any[] = await mysqlPromise('SHOW tables;');
    return tables.map(item => item['Tables_in_nimbus']);
}

async function getTablesCreateScripts(): Promise<string> {
    const allTablesInDb = await getTablesNames();

    const query = allTablesInDb.map(i => `show create table \`${i}\`;\n`).join('');
    const result = await mysqlPromise(query);

    return result.map(i => i[0]['Create Table']).join(';\n') + ';';
}

async function parseTableScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getTablesCreateScripts();

    if (Config.debug.dump_database_script) {
        await new Promise((resolve,reject) => fs.writeFile('db.tables.script', actualScripts, (err) => { if (err) reject(err); resolve(); }));
    }

    StringLoader.readStringSchemaDefinition(actualScripts, resultTransport);
}

async function getTriggersCreateScripts(): Promise<ActualTriggerEntry[]> {
    const triggers: any[] = await mysqlPromise('SELECT * FROM INFORMATION_SCHEMA.TRIGGERS where TRIGGER_SCHEMA != ?;', ['sys']);
    return triggers.map(i => ({
        name: i['TRIGGER_NAME'],
        event: i['EVENT_MANIPULATION'],
        table: i['EVENT_OBJECT_TABLE'],
        order: i['ACTION_ORDER'],
        condition: i['ACTION_CONDITION'],
        statement: i['ACTION_STATEMENT'],
        orientation: i['ACTION_ORIENTATION'],
        timing: i['ACTION_TIMING']
    }));
}

async function parseTriggersScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getTriggersCreateScripts();

    if (Config.debug.dump_database_script) {
        const serialized = util.inspect(actualScripts, { colors: false, compact: false, showHidden: false, depth: null });
        await new Promise((resolve,reject) => fs.writeFile('db.triggers.script', serialized, (err) => { if (err) reject(err); resolve(); }));
    }

    for(const item of actualScripts) {
        const newItem: SchemaItem = { 
            itemName: item.name, 
            ast: {
                schema_item: 'trigger',
                name: item.name, 
                table_name: item.table, 
                time: item.timing, 
                event: item.event, 
                body: item.statement
            }, 
            schemaItemType: 'trigger', 
            createScript: null
        };

        resultTransport.triggers.asArray.push(newItem);
        resultTransport.triggers.asHash[item.name] = newItem;
    }
}

async function getStoredProcedures(): Promise<ActualStoredProcedure[]> {
    const procedures: any[] = await mysqlPromise('SELECT * FROM INFORMATION_SCHEMA.ROUTINES where routine_schema != ? and routine_type = ?;', ['sys', 'PROCEDURE']);
    return procedures.map(i => ({
        name: i['SPECIFIC_NAME'],
        type: i['ROUTINE_TYPE'],
        bodyType: i['ROUTINE_BODY'],
        definition: i['ROUTINE_DEFINITION']
    }));
}

async function parseStoredProceduresScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getStoredProcedures();

    if (Config.debug.dump_database_script) {
        const serialized = util.inspect(actualScripts, { colors: false, compact: false, showHidden: false, depth: null });
        await new Promise((resolve,reject) => fs.writeFile('db.procedures.script', serialized, (err) => { if (err) reject(err); resolve(); }));
    }

    for(const item of actualScripts) {
        const newItem: SchemaItem = { 
            itemName: item.name, 
            ast: {
                schema_item: 'procedure',
                name: item.name, 
                body: item.definition
            }, 
            schemaItemType: 'procedure', 
            createScript: null
        };

        resultTransport.procedures.asArray.push(newItem);
        resultTransport.procedures.asHash[item.name] = newItem;
    }
}

export async function getDatabaseSchema(): Promise<CombinedParsingResult> {
    const result: CombinedParsingResult = { 
        tables: { asArray: [], asHash: {} }, 
        procedures: { asArray: [], asHash: {} }, 
        triggers: { asArray: [], asHash: {} },
        functions: { asArray: [], asHash: {} }
    };

    await parseTableScripts(result);
    await parseTriggersScripts(result);
    await parseStoredProceduresScripts(result);

    return result;
}
