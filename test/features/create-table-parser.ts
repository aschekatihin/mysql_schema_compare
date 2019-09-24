require('source-map-support').install();

import { describe, it } from 'mocha';
import { should, expect } from 'chai';

import * as StringLoader from '../../src/loaders/string-loader';
import { CombinedParsingResult } from '../../src/models/common-models';

describe('create table statement', () => {

    it('should parse column modifiers', () => {
        const sql = `
            CREATE TABLE Sample (
                intColumn INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
                varcharColumn varchar(20) DEFAULT NULL
            );
            `;

        const result: CombinedParsingResult = { 
            tables: { asArray: [], asHash: {} }, 
            procedures: { asArray: [], asHash: {} }, 
            triggers: { asArray: [], asHash: {} },
            functions: { asArray: [], asHash: {} }
        };

        StringLoader.readStringSchemaDefinition(sql, result);

        expect(result).to.be.not.null;
        expect(result.tables.asArray).to.be.not.empty;
        expect(result.tables.asArray[0].ast).to.be.not.null.and.not.empty;

        const ast = result.tables.asArray[0].ast;
        expect(ast.definitions).to.be.not.null.and.not.empty;

        const intColumn = ast.definitions.find(i => i.name ==='intColumn');
        expect(intColumn).to.be.not.null;
        expect(intColumn.datatype).to.be.not.null;
        expect(intColumn.auto_incr).to.be.true;
        expect(intColumn.is_pk).to.be.true;
        expect(intColumn.nullable).to.be.false;
    });

});
