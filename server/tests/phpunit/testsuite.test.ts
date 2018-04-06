import { parse } from 'fast-xml-parser';
import { files } from '../../src/filesystem';
import {JUnit} from '../../src/phpunit';
import { resolve } from 'path';

describe('Testsuite Test', () => {
    it('it should return test case', async () => {
        const junit: JUnit = new JUnit;
        const content: string = await files.get(resolve(__dirname, '../fixtures/junit.xml'));
        console.log(junit.parse(content));
    });
});
