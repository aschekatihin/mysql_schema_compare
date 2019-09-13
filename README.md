# WIP

# Come back a bit later.


Tool compares schemas defined in .sql files (CREATE TABLE statements) to live mysql server database.
USE ..., CREATE DATABASE..., DROP ... statements are allowed in definitions and ignored.

# CLI

```$ mysql-schema-compare <options> <.sql files>```
                                                                                                    
## Database Options                                                            

| Paramtere | Description |
|-----------|-------------|
| --db-host string | Database server host name |
| --db-port string | Database server port (default 3306) |
| --db-user string | User name for database connection (default root) |
| --db-pass string | Password for database connection (default root) |
| --db-name string | Schema name of database server |
| --schema string | You can specify list of sql files explicitly with this parameter |

## Processing options                                                          

| Paramtere | Description |
|-----------|-------------|
| --err-extra true/false | Treat items not described in definitions but present in database as error (default false) |                       


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
