import * as dotenv from 'dotenv';
import * as args from 'command-line-args';
import * as _ from 'lodash';

import optionsDefinitions from './cmdline-options-definitions';

const options = args(optionsDefinitions);

export const Config = {
    mysql: {
        host: options['db-host'] || process.env['DB_HOST'] || '',
        port: options['db-port'] || process.env['DB_PORT'] || 3306,
        user: options['db-user'] || process.env['DB_USER'] || 'root',
        password: options['db-pass'] || process.env['DB_PASS'] || '',
        database: options['db-name'] || process.env['DB_NAME'] || 'not-set'
    },
    schemaDefinitions: options['schema'] || (process.env['SCHEMA'] ? process.env['SCHEMA'].split(',') : []),
    general: {
        warn_if_extra_tables: _.isNil(options['err-extra']) === false 
                                ? options['err-extra'] 
                                : (
                                    _.isNil(process.env['ERR_EXTRA']) !== null 
                                        ? process.env['ERR_EXTRA'] 
                                        : false),
        quote_identifiers: false,
        trace_ast: _.isNil(process.env['TRACE_AST']) === false ? process.env['TRACE_AST'] : false,
        ignore_collation: _.isNil(process.env['IGNORE_COLLATIONS']) === false ? process.env['IGNORE_COLLATION'] : true,
        compare_indexes_names: false,
        help_requested: options['help'] === null,
        ignore_index_names: true
    },
    debug: {
        dump_database_script: _.isNil(process.env['DUMP_DB_SCRIPT']) === false ? process.env['DUMP_DB_SCRIPT'] : false,
        dump_asts: _.isNil(process.env['DUMP_ASTS']) === false ? process.env['DUMP_ASTS'] : false
    }
};
