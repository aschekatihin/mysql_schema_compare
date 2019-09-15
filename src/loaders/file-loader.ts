import * as fs from 'fs';
import * as util from 'util';

import { ParsingResult, SchemaItem, CombinedParsingResult } from "../models/common-models";
import * as StringLoader from './string-loader';

export async function getExpectedSchema(files: string[]): Promise<CombinedParsingResult> {
    const result: CombinedParsingResult = { 
        tables: { asArray: [], asHash: {} }, 
        procedures: { asArray: [], asHash: {} }, 
        triggers: { asArray: [], asHash: {} }
    };

    const readFilePromises = files.map(fileName => new Promise<string>((resolve, reject) => fs.readFile(fileName, 'utf8', 
        (err, data) => { if (err) reject(err); resolve(data); })));

    const contents = await Promise.all(readFilePromises);

    for(const item of contents) {
        StringLoader.readStringSchemaDefinition(item, result);
    }

    return result;
}
