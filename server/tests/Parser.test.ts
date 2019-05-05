import Parser, { TestSuiteInfo } from '../src/Parser';
import URI from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import files from '../src/Filesystem';
import { projectPath } from './helpers';

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
    ): Promise<TestSuiteInfo | undefined> => {
        const suite = await parser.parse(testfile);

        return suite;
    };

    const getTest = (suite: TestSuiteInfo, options: any = {}) => {
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

        expect(suite).toEqual(
            jasmine.objectContaining({
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            })
        );
    });

    it('passed', async () => {
        const suite = await getTestSuite();

        const id = getId('test_passed');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('failed', async () => {
        const suite = await getTestSuite();

        const id = getId('test_failed');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
                depends: ['test_passed'],
            })
        );
    });

    it('test_isnt_same', async () => {
        const suite = await getTestSuite();

        const id = getId('test_isnt_same');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('test_risky', async () => {
        const suite = await getTestSuite();

        const id = getId('test_risky');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('annotation_test', async () => {
        const suite = await getTestSuite();

        const id = getId('annotation_test');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('test_skipped', async () => {
        const suite = await getTestSuite();

        const id = getId('test_skipped');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('test_incomplete', async () => {
        const suite = await getTestSuite();

        const id = getId('test_incomplete');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('addition_provider', async () => {
        const suite = await getTestSuite();

        const id = getId('addition_provider');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
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

        const id = getId('test_passed');
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('leading comments', async () => {
        const file = projectPath('tests/Directory/LeadingCommentsTest.php');
        const suite = await getTestSuite(file);

        const id = getId(
            'firstLeadingComments',
            'Recca0120\\VSCode\\Tests\\Directory\\LeadingCommentsTest'
        );
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
            })
        );
    });

    it('has property', async () => {
        const file = projectPath('tests/Directory/HasPropertyTest.php');
        const suite = await getTestSuite(file);

        const id = getId(
            'property',
            'Recca0120\\VSCode\\Tests\\Directory\\HasPropertyTest'
        );
        const test = getTest(suite, { id });

        expect(test).toEqual(
            jasmine.objectContaining({
                id: id,
                label: id,
                file: file.toString(),
                line: jasmine.anything(),
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
                arguments: [file.toString(), suite.range.start],
            },
            data: {
                arguments: [file.fsPath],
                range: {
                    end: {
                        character: 1,
                        line: 69,
                    },
                    start: {
                        character: 0,
                        line: 7,
                    },
                },
                type: 'suite',
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
                arguments: [file.toString(), test.range.start],
            },
            data: {
                arguments: [
                    file.fsPath,
                    '--filter',
                    '^.*::(test_passed|test_failed)( with data set .*)?$',
                ],
                range: {
                    end: {
                        character: 5,
                        line: 22,
                    },
                    start: {
                        character: 5,
                        line: 19,
                    },
                },
                type: 'test',
            },
        });
    });
});
