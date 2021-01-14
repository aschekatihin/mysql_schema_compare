import * as fs from 'fs';
import * as util from 'util';

import { CombinedParsingResult } from "../models/common-models";
import * as StringLoader from './string-loader';

const readFilePromise = util.promisify(fs.readFile);

export async function getExpectedSchema(files: string[]): Promise<CombinedParsingResult> {
    const result: CombinedParsingResult = {
        tables: { asArray: [], asHash: {} },
        procedures: { asArray: [], asHash: {} },
        triggers: { asArray: [], asHash: {} },
        functions: { asArray: [], asHash: {} },
        views: { asArray: [], asHash: {} },
    };

    const readFilePromises = files.map(fileName => readFilePromise(fileName, { encoding: 'utf8' }));

    const contents = await Promise.all(readFilePromises);

    for(const item of contents) {
        StringLoader.readStringSchemaDefinition(item, result);
    }

    return result;
}
