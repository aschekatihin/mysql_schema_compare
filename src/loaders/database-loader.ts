import * as fs from 'fs';

import mysqlPromise from "../mysql-promise";

import { ParsingResult, SchemaItem, ActualTriggerEntry, ActualStoredProcedure } from "../models/common-models";
import { StringLoader } from "./string-loader";
import { Config } from '../config';

export class DatabaseLoader {

    public static async getParsedTableScripts(): Promise<ParsingResult> {
        const actualScripts = await DatabaseLoader.getTablesCreateScripts();

        if (Config.debug.dump_database_script) {
            await new Promise((resolve,reject) => fs.writeFile('db.script', actualScripts, (err) => { if (err) reject(err); resolve(); }));
        }
    
        const parsed = StringLoader.readStringSchemaDefinition(actualScripts);
        return parsed;
    }
    
    public static async getDatabaseTriggersCreateScript(): Promise<ActualTriggerEntry[]> {
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
    
    public static async getDatabaseStoredProcedures(): Promise<ActualStoredProcedure[]> {
        const procedures: any[] = await mysqlPromise('SELECT * FROM INFORMATION_SCHEMA.ROUTINES where routine_schema != ?;', ['sys']);
        return procedures.map(i => ({
            name: i['SPECIFIC_NAME'],
            type: i['ROUTINE_TYPE'],
            bodyType: i['ROUTINE_BODY'],
            definition: i['ROUTINE_DEFINITION']
        }));
    }

    private static async getTablesNames(): Promise<string[]> {
        const tables: any[] = await mysqlPromise('SHOW tables;');
        return tables.map(item => item['Tables_in_nimbus']);
    }

    private static async getTablesCreateScripts(): Promise<string> {
        const allTablesInDb = await DatabaseLoader.getTablesNames();

        const query = allTablesInDb.map(i => `show create table \`${i}\`;\n`).join('');
        const result = await mysqlPromise(query);

        return result.map(i => i[0]['Create Table']).join(';\n') + ';';
    }
}
