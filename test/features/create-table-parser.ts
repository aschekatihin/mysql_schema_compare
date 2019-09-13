require('source-map-support').install();

import { describe, it } from 'mocha';
import { should, expect } from 'chai';

import {StringLoader} from '../../src/loaders/string-loader';

describe('create table statement', () => {

    it('should parse data types', () => {
        const sql = `
            CREATE TABLE Sample (
                intColumn INT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
                varcharColumn varchar(20) DEFAULT NULL
            );
            `;

        const result = StringLoader.readStringSchemaDefinition(sql);

        expect(result).to.be.not.null;
        expect(result.asArray).to.be.not.empty;
        expect(result.asArray[0].ast).to.be.not.null.and.not.empty;

        const ast = result.asArray[0].ast;
        expect(ast.definitions).to.be.not.null.and.not.empty;

        const intColumn = ast.definitions.find(i => i.name ==='intColumn');
        expect(intColumn).to.be.not.null;
        expect(intColumn.datatype).to.be.not.null;
    });

});
