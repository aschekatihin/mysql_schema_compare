const optionDefinitions = [
    {
        name: 'db-host',
        // typeLabel: 'host_name',
        description: 'Database server host name',
        group: 'db'
    },
    {
        name: 'db-port',
        description: 'Database server port (default 3306)',
        group: 'db'
    },
    {
        name: 'db-user',
        description: 'User name for database connection (default root)',
        group: 'db'
    },
    {
        name: 'db-pass',
        description: 'Password for database connection (default root)',
        group: 'db'
    },
    {
        name: 'db-name',
        description: 'Schema name of database server',
        group: 'db'
    },
    {
        name: 'err-extra',
        typeLabel: 'true/false',
        description: 'Treat items not described in definitions but present in database as error (default false)',
        group: 'proc'
    },
    // {
    //     name: 'colors',
    //     description: 'Disables colored output when present',
    //     group: 'proc'
    // }
];

const helpSections = [
    {
        header: 'Synopsis',
        content: '$ mysql-schema-compare <options> <.sql files>'
    },
    {
        header: 'Database Options',
        optionList: optionDefinitions,
        group: 'db'
    },
    {
        header: 'Processing options' ,
        optionList: optionDefinitions,
        group: 'proc'
    },
    {
        header: 'Also configuration with environment variables or .env file supported',
        content: [
            { name: 'DB_HOST', summary: 'Corresponds to --db-host option' },
            { name: 'DB_PORT', summary: 'Corresponds to --db-port option' },
            { name: 'DB_USER', summary: 'Corresponds to --db-user option' },
            { name: 'DB_PASS', summary: 'Corresponds to --db-pass option' },
            { name: 'DB_NAME', summary: 'Corresponds to --db-name option' },
            { name: 'SCHEMA', summary: 'Comma separated list of .sql files' },
            { name: 'ERR_EXTRA', summary: 'Corresponds to --err-extra option' }
        ]
    }
];

export default helpSections;
