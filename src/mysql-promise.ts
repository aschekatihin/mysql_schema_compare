import * as mysql from 'mysql';

import {Config} from './config';

export default async function mysqlPromise(sql: string, args?: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
        var connection = mysql.createConnection({
            host: Config.mysql.host,
            port: Config.mysql.port,
            user: Config.mysql.user,
            password: Config.mysql.password,
            database: Config.mysql.database,
            multipleStatements: true
          });
    
        connection.connect((connectError, conn) => {
            if (connectError) {
                reject(connectError);
                return;
            }
    
            const queryOptions: mysql.QueryOptions = {
                sql,
                values: args
            };

            connection.query(queryOptions, function (queryError, results, fields) {
                if (queryError) {
                    reject(queryError);
                    return;
                }

                resolve(results);
              });
        });
    });
}
