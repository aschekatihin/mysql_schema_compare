# WIP



# Description

Tool compares schemas defined in .sql files (CREATE TABLE statements) to live mysql server database.

USE ..., CREATE DATABASE..., DROP ... statements, single line and multiline comments are allowed in definitions and ignored.



# Supported syntax/features

Mysql 5.x only atm.

* Tables
    * Columns with all data types
    * Indexes
    * Foreign keys
* Triggers
    * Whole body text compared
    * Body should be always enclosed in BEGIN ... END even if it is a single statement
* Stored procedures (whole body text compared)



# CLI

```$ mysql-schema-compare <options> <.sql files>```

## Database Options

| Parameter | Description |
|-----------|-------------|
| --db-host string | Database server host name |
| --db-port string | Database server port (default 3306) |
| --db-user string | User name for database connection (default root) |
| --db-pass string | Password for database connection (default root) |
| --db-name string | Schema name of database server |
| --schema string | You can specify list of sql files explicitly with this parameter |

## Processing options

| Parameter | Description |
|-----------|-------------|
| --err-extra true/false | Treat items not described in definitions but present in database as error (default false) |


## Mics options

| Parameter | Description |
|-----------|-------------|
| --help    | Displays this CLI usage help |


## Same options are also configurable with environment variables or .env file

| Env variable name | |
|---|---|
| DB_HOST | Corresponds to _--db-host_ option |
| DB_PORT | Corresponds to _--db-port_ option |
| DB_USER | Corresponds to _--db-user_ option |
| DB_PASS | Corresponds to _--db-pass_ option |
| DB_NAME | Corresponds to _--db-name_ option |
| SCHEMA  | Comma separate list of .sql files |
| ERR_EXTRA | Corresponds to _--err-extra_ option |

## Error codes

| Code | Meaning |
|------|---------|
|    0 | Everything is fine, schemas match |
|    1 | Schemas differ | 
|    5 | Definitions parsing error (could happen when parsing database actual schema if unsupported element encountered) |
|    8 | Invalid configuration. Most probabl some required parameter is missing |
|   10 | Exception. Please report this as issue |
