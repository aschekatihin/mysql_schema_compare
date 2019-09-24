require('source-map-support').install();

import { describe, it } from 'mocha';
import { should, expect } from 'chai';

import * as StringLoader from '../../src/loaders/string-loader';
import { CombinedParsingResult } from '../../src/models/common-models';

describe('create table data types', () => {

    it('should understand INT type aliases', () => {
        const sql = `
            CREATE TABLE Sample (
                c1 INT,
                c2 INTEGER
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

        const c1Column = ast.definitions.find(i => i.name ==='c1');
        expect(c1Column).to.be.not.null;
        expect(c1Column.datatype).to.be.not.null;
        expect(c1Column.datatype.type).to.be.equal('int');

        const c2Column = ast.definitions.find(i => i.name ==='c2');
        expect(c2Column).to.be.not.null;
        expect(c2Column.datatype).to.be.not.null;
        expect(c2Column.datatype.type).to.be.equal('int');
    });

    it('should understand BOOL type aliases and replace with tinyint(1)', () => {
        const sql = `
            CREATE TABLE Sample (
                c1 BOOL,
                c2 BOOLEAN
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

        const c1Column = ast.definitions.find(i => i.name ==='c1');
        expect(c1Column).to.be.not.null;
        expect(c1Column.datatype).to.be.not.null;
        expect(c1Column.datatype.type).to.be.equal('tinyint');
        expect(c1Column.datatype.width).to.be.equal(1);

        const c2Column = ast.definitions.find(i => i.name ==='c2');
        expect(c2Column).to.be.not.null;
        expect(c2Column.datatype).to.be.not.null;
        expect(c2Column.datatype.type).to.be.equal('tinyint');
        expect(c1Column.datatype.width).to.be.equal(1);
    });
});

