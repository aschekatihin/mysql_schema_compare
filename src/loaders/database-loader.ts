import * as fs from 'fs';
import * as util from 'util';
import * as _ from 'lodash';

import mysqlPromise from "../mysql-promise";
import { SchemaItem, ActualTriggerEntry, ActualStoredProcedure, CombinedParsingResult } from "../models/common-models";
import * as StringLoader from "./string-loader";
import { Config } from '../config';

const writeFilePromise = util.promisify(fs.writeFile);

async function getTablesNames(): Promise<string[]> {
    const tables: any[] = await mysqlPromise('SHOW FULL tables where Table_type = \'BASE TABLE\';');
    return tables.map(item => item['Tables_in_nimbus']);
}

async function getTablesCreateScripts(): Promise<string> {
    const allTablesInDb = await getTablesNames();

    const query = allTablesInDb.map(i => `show create table \`${i}\`;\n`).join('');
    const result = await mysqlPromise(query);

    return result.map(i => _.isArray(i) ? i[0]['Create Table'] : i['Create Table'])
                .join(';\n') + ';';
}

async function parseTableScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getTablesCreateScripts();

    if (Config.debug.dump_database_script) {
        await writeFilePromise('db.tables.script', actualScripts, { encoding: 'utf8' });
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
        await writeFilePromise('db.triggers.script', serialized, { encoding: 'utf8' });
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

async function getStoredProceduresAndFunctions(): Promise<ActualStoredProcedure[]> {
    const procedures: any[] = await mysqlPromise('SELECT * FROM INFORMATION_SCHEMA.ROUTINES where routine_schema != ? and routine_type in (?);', ['sys', ['PROCEDURE', 'FUNCTION']]);
    return procedures.map(i => ({
        name: i['SPECIFIC_NAME'],
        type: i['ROUTINE_TYPE'],
        bodyType: i['ROUTINE_BODY'],
        definition: i['ROUTINE_DEFINITION']
    }));
}

async function parseStoredProceduresScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getStoredProceduresAndFunctions();

    if (Config.debug.dump_database_script) {
        const serialized = util.inspect(actualScripts, { colors: false, compact: false, showHidden: false, depth: null });
        await writeFilePromise('db.procedures.script', serialized, { encoding: 'utf8' });
    }

    for(const item of actualScripts) {
        const type = item.type.toLowerCase();

        const newItem: SchemaItem = { 
            itemName: item.name, 
            ast: {
                schema_item: type,
                name: item.name, 
                body: item.definition
            }, 
            schemaItemType: type, 
            createScript: null
        };

        switch(type) {
            case 'procedure':
                resultTransport.procedures.asArray.push(newItem);
                resultTransport.procedures.asHash[item.name] = newItem;
                break;

            case 'function':
                resultTransport.functions.asArray.push(newItem);
                resultTransport.functions.asHash[item.name] = newItem;
                break;

            default:
                console.warn('Unsupported routine type ' + type);
        }
    }
}

async function getViewNames(): Promise<string[]> {
    const tables: any[] = await mysqlPromise('SHOW FULL tables where Table_type = \'VIEW\';');
    return tables.map(item => item['Tables_in_nimbus']);
}

async function getViewsCreateScripts() {
    const allTablesInDb = await getViewNames();

    const query = allTablesInDb.map(i => `show create view \`${i}\`;\n`).join('');
    const result = await mysqlPromise(query);

    return result.map(i => _.isArray(i) ? i[0]['Create View'] : i['Create View'])
                .join(';\n') + ';';
}

async function parseViewsScripts(resultTransport: CombinedParsingResult): Promise<void> {
    const actualScripts = await getViewsCreateScripts();

    if (Config.debug.dump_database_script) {
        await writeFilePromise('db.views.script', actualScripts, { encoding: 'utf8' });
    }

    StringLoader.readStringSchemaDefinition(actualScripts, resultTransport);
}

export async function getDatabaseSchema(): Promise<CombinedParsingResult> {
    const result: CombinedParsingResult = { 
        tables: { asArray: [], asHash: {} }, 
        procedures: { asArray: [], asHash: {} }, 
        triggers: { asArray: [], asHash: {} },
        functions: { asArray: [], asHash: {} },
        views: { asArray: [], asHash: {} },
    };

    await Promise.all([
        parseTableScripts(result),
        parseTriggersScripts(result),
        parseStoredProceduresScripts(result),
        parseViewsScripts(result)
    ]);

    return result;
}
