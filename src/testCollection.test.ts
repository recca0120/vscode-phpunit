import { phpUnitProject } from './phpunit/__tests__/utils';
import { PHPUnitXML, TestCaseParser } from './phpunit';
import { TestCollection } from './testCollection';
import { Uri } from 'vscode';
import { readFile } from 'node:fs/promises';

describe('TestCollection', () => {
    const root = phpUnitProject('');
    let collection: TestCollection;
    beforeEach(async () => {
        const parser = new TestCaseParser();
        const phpunitXML = new PHPUnitXML(await readFile(phpUnitProject('phpunit.xml')));
        return collection = new TestCollection(root, parser, phpunitXML);
    });
    it('add test', async () => {
        const uri = Uri.file(phpUnitProject('tests/AssertionsTest.php'));
        await collection.addUri(uri);
    });
});