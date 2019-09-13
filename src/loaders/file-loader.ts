import * as fs from 'fs';
import * as util from 'util';

import { ParsingResult, SchemaItem } from "../models/common-models";
import { StringLoader } from './string-loader';

export class FileLoader {

    public static async readDbSchemaDefinition(fileName: string): Promise<ParsingResult> {
        // const readFilePromise = util.promisify(fs.readFile);

        const data = await new Promise<string>((resolve, reject) => fs.readFile(fileName, 'utf8', 
            (err, data) => { if (err) reject(err); resolve(data); }));
    
        return StringLoader.readStringSchemaDefinition(data);
    }

}
