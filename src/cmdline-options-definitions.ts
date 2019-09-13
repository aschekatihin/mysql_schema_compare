
const optionsDefinitions = [
    { name: 'db-host', alias: 'h', type: String },
    { name: 'db-port', alias: 'p', type: Number },
    { name: 'db-user', alies: 'u', type: String },
    { name: 'db-pass', alias: 's', type: String },
    { name: 'db-name', alias: 'n', type: String },
    { name: 'err-extra', type: Boolean },
    { name: 'schema', alias: 'd', type: String, multiple: true, defaultOption: true },
    { name: 'help' }
];

export default optionsDefinitions;
