require('source-map-support').install();
require('dotenv').config();

import * as util from 'util';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as commandLineUsage from 'command-line-usage';

import { Config } from './config';
import * as databaseVisitor from './visitors/database-visitor';
import { ComparisonReport, ComparisonReportItem } from './models/report-models';
import * as DatabaseLoader from './loaders/database-loader';
import * as FileLoader from './loaders/file-loader';
import * as ErrorCodes from './error-codes';
import helpSections from './cmdline-usage-help';

const Indent1 = '\t';
const Indent2 = '\t\t';

const processLogPrefix = '»';
const schemaItemTypePrefix = '°';

const writerFilePromise = util.promisify(fs.writeFile);

async function main() {
    console.log(processLogPrefix, 'Loading database schema...');
    const dbState = await DatabaseLoader.getDatabaseSchema();

    console.log(processLogPrefix, 'Loading file schemas...');
    const expectedState = await FileLoader.getExpectedSchema(Config.schemaDefinitions);

    if (Config.debug.dump_asts) {
        const actual = util.inspect(dbState, { colors: false, compact: false, showHidden: false, depth: null });
        const expected = util.inspect(expectedState, { colors: false, compact: false, showHidden: false, depth: null });

        await writerFilePromise('actual.ast', actual, { encoding: 'utf8' });
        await writerFilePromise('expected.ast', expected, { encoding: 'utf8' });
    }

    console.log(processLogPrefix, 'Comparing schemas...');

    const newReport: ComparisonReport = { tables: [], procedures: [], triggers: [], functions: [], views: [] };
    databaseVisitor.visit(newReport, dbState, expectedState);

    console.log(processLogPrefix, 'Results:');

    let totalDifferences = 0;
    totalDifferences += displayReportSection(newReport.tables, 'Tables:');
    totalDifferences += displayReportSection(newReport.triggers, 'Triggers:');
    totalDifferences += displayReportSection(newReport.procedures, 'Stored procedures:');
    totalDifferences += displayReportSection(newReport.functions, 'Functions:');
    totalDifferences += displayReportSection(newReport.views, 'Views:');
    
    if (totalDifferences > 0) {
        console.log('\n\n', 'Total differences:', totalDifferences, '\n\n');
        process.exit(ErrorCodes.SchemasDiffer);
    } else {
        console.log(Indent1, chalk.green('Schemas match.'));
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
    if (Config.general.help_requested) {
        const usage = commandLineUsage(helpSections)
        console.log(usage)
        process.exit(ErrorCodes.Ok);
    }
}

function displayReportSection(section: ComparisonReportItem[], sectionName: string): number {
    if (!section || section.length === 0) {
        return 0;
    }
    
    console.log(schemaItemTypePrefix, sectionName);

    for(const entry of section.filter(i => i.problems.length > 0)) {
        console.log('\n', Indent1, entry.name);

        for(const promblm of entry.problems) {
            let color = chalk.white;

            switch(promblm.problemType) {
                case "differs": 
                    color = chalk.yellow;
                    break;

                case "missing":
                    color = chalk.red;
                    break;

                // case "not expected":
                //     color = chalk.default.magenta;
                //     break;
            }

            console.log(Indent2, '·', color(promblm.problemType), ':', promblm.problemText);
        }
    }

    console.log();

    return section.reduce((acc, val) => acc + val.problems.length, 0);
}

displayHelpIfRequested();
checkConfiguration();

console.log(processLogPrefix, 'Starting...');
main()
    .then(_ => {
        process.exit(ErrorCodes.Ok);
    })
    .catch(err => {
        console.error('err handler', err);
        process.exit(ErrorCodes.Exception);
    });
