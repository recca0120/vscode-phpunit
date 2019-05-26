import files from '../src/Filesystem';
import Parser, { TestSuiteNode } from '../src/Parser';
import URI from 'vscode-uri';
import { projectPath } from './helpers';
import { TextDocument } from 'vscode-languageserver-protocol';

describe('Parser', () => {
    const parser = new Parser();
    const file = projectPath('tests/AssertionsTest.php');

    const getId = (
        id: string,
        clazz = 'Recca0120\\VSCode\\Tests\\AssertionsTest'
    ) => {
        return `${clazz}::${id}`;
    };

    const getTestSuite = async (
        testfile: URI = file
    ): Promise<TestSuiteNode | undefined> => {
        const suite = await parser.parse(testfile);

        return suite;
    };

    const getTest = (suite: TestSuiteNode, options: any = {}) => {
        return suite.children.find(test => {
            for (const key in options) {
                if (
                    JSON.stringify(test[key]) !== JSON.stringify(options[key])
                ) {
                    return false;
                }
            }
            return true;
        });
    };

    it('class', async () => {
        const suite = await getTestSuite();
        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
        const label = id;

        expect(suite).toEqual(
            jasmine.objectContaining({
                id,
                label,
            })
        );
    });

    it('passed', async () => {
        const suite = await getTestSuite();

        const label = 'test_passed';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('failed', async () => {
        const suite = await getTestSuite();

        const label = 'test_failed';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
                depends: ['test_passed'],
            })
        );
    });

    it('test_isnt_same', async () => {
        const suite = await getTestSuite();

        const label = 'test_isnt_same';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('test_risky', async () => {
        const suite = await getTestSuite();

        const label = 'test_risky';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('annotation_test', async () => {
        const suite = await getTestSuite();

        const label = 'annotation_test';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('test_skipped', async () => {
        const suite = await getTestSuite();

        const label = 'test_skipped';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('test_incomplete', async () => {
        const suite = await getTestSuite();

        const label = 'test_incomplete';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('addition_provider', async () => {
        const suite = await getTestSuite();

        const label = 'addition_provider';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('abstract class', async () => {
        const file = projectPath('tests/AbstractTest.php');
        const suite = await getTestSuite(file);

        expect(suite).toBeNull();
    });

    it('static method', async () => {
        const file = projectPath('tests/StaticMethodTest.php');
        const suite = await getTestSuite(file);

        expect(suite).toBeNull();
    });

    it('parse text document', async () => {
        const parser = new Parser();

        const suite = parser.parseTextDocument(
            TextDocument.create(
                file.toString(),
                'php',
                1,
                await files.get(file)
            )
        );

        const label = 'test_passed';
        const id = getId(label);
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('leading comments', async () => {
        const file = projectPath('tests/Directory/LeadingCommentsTest.php');
        const suite = await getTestSuite(file);

        const label = 'firstLeadingComments';
        const id = getId(
            label,
            'Recca0120\\VSCode\\Tests\\Directory\\LeadingCommentsTest'
        );
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('use trait', async () => {
        const file = projectPath('tests/Directory/UseTraitTest.php');
        const suite = await getTestSuite(file);

        const label = 'use_trait';
        const id = getId(
            label,
            'Recca0120\\VSCode\\Tests\\Directory\\UseTraitTest'
        );
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('has property', async () => {
        const file = projectPath('tests/Directory/HasPropertyTest.php');
        const suite = await getTestSuite(file);

        const label = 'property';
        const id = getId(
            label,
            'Recca0120\\VSCode\\Tests\\Directory\\HasPropertyTest'
        );
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label,
                file: file.toString(),
                line: jasmine.any(Number),
            })
        );
    });

    it('parse code error', () => {
        const parser = new Parser();

        expect(parser.parseCode('a"bcde', URI.parse('/usr/bin'))).toBeNull();
    });

    it('class as codelens', async () => {
        const suite = await getTestSuite();

        expect(suite.asCodeLens()).toEqual({
            range: suite.range,
            command: {
                title: 'Run Test',
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [suite.id],
            },
        });
    });

    it('method as codelens', async () => {
        const suite = await getTestSuite();

        const test = getTest(suite, {
            method: 'test_failed',
            depends: ['test_passed'],
        });

        expect(test.asCodeLens()).toEqual({
            range: test.range,
            command: {
                title: 'Run Test',
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [test.id],
            },
        });
    });
});
