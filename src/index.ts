require('source-map-support').install();
require('dotenv').config();

import * as util from 'util';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as commandLineUsage from 'command-line-usage';

import { Config } from './config';
import * as databaseVisitor from './visitors/database-visitor';
import { ComparisonReport } from './models/report-models';
import { DatabaseLoader } from './loaders/database-loader';
import { FileLoader } from './loaders/file-loader';
import * as ErrorCodes from './error-codes';
import helpSections from './cmdline-usage-help';

const tablesIndent = '\t';
const tablesSubIndent = '\t\t';

async function main() {
    const dbState = await DatabaseLoader.getParsedTableScripts();

    console.log('file', Config.schemaDefinitions[0]);
    const fileState = await FileLoader.readDbSchemaDefinition(Config.schemaDefinitions[0]);

    if (Config.debug.dump_asts) {
        const actual = util.inspect(dbState, { colors: false, compact: false, showHidden: false, depth: null });
        const expected = util.inspect(fileState, { colors: false, compact: false, showHidden: false, depth: null });

        await new Promise((resolve,reject) => fs.writeFile('actual.ast', actual, (err) => { if (err) reject(err); resolve(); }));
        await new Promise((resolve,reject) => fs.writeFile('expected.ast', expected, (err) => { if (err) reject(err); resolve(); }));
    }

    const newReport: ComparisonReport = { tables: [], storedProcedures: [], triggers: []};
    
    databaseVisitor.visit(newReport, dbState, fileState);

    console.log('Compare results:');

    console.log('° Tables:');
    if (newReport.tables) {
        for(const entry of newReport.tables.filter(i => i.problems.length > 0)) {
            console.log();
            console.log(tablesIndent, entry.name);

            for(const promblm of entry.problems) {
                console.log(tablesSubIndent, '·', promblm.problemType, ':', promblm.problemText);
            }
        }

        const totalErrors = newReport.tables.reduce((acc, val) => acc + val.problems.length, 0);
        console.log('Total errors:', totalErrors);

        process.exit(ErrorCodes.SchemasDiffer);
    } else {
        console.log(tablesIndent, chalk.default.green('Ok'));
    }
}

/**
 * Checks for minimum configuration present
 */
function checkConfiguration() {
    if (!Config.schemaDefinitions) {
        console.log('No schema files specified');
        process.exit(ErrorCodes.Misconfigured);
    }

    if (!Config.mysql.host) {
        console.log('No mysql host specified');
        process.exit(ErrorCodes.Misconfigured);
    }
}

function displayHelpIfRequested() {
    console.log(Config.general.help_requested);

    if (Config.general.help_requested) {
        const usage = commandLineUsage(helpSections)
        console.log(usage)
        process.exit(ErrorCodes.Ok);
    }
}

displayHelpIfRequested();
checkConfiguration();

console.log('starting...');
main()
    .then(_ => {
        console.log('done.');
        process.exit(ErrorCodes.Ok);
    })
    .catch(err => {
        console.log('err handler', err);
        process.exit(ErrorCodes.Exception);
    });
