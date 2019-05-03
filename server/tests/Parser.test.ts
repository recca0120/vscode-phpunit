import Parser, { Test, TestSuite } from '../src/Parser';
import URI from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import files from '../src/Filesystem';
import { projectPath } from './helpers';

describe('Parser', () => {
    const parser = new Parser();
    const file = projectPath('tests/AssertionsTest.php');

    const getTestSuite = async (testfile: URI = file): Promise<TestSuite> => {
        const suites = await parser.parse(testfile);

        return suites[0];
    };

    const getTest = (suite: TestSuite, options: any = {}) => {
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

    const expectTest = (test: Test, actual: any) => {
        const expectObj = {
            class: test.class,
            depends: test.depends,
            kind: test.kind,
            method: test.method,
            namespace: test.namespace,
            range: test.range,
            uri: test.uri,
        };

        expect(expectObj).toEqual(
            Object.assign(
                {
                    class: 'AssertionsTest',
                    depends: [],
                    kind: 'method',
                    method: '',
                    namespace: 'Recca0120\\VSCode\\Tests',
                    range: {
                        start: jasmine.objectContaining({
                            line: jasmine.anything(),
                            character: jasmine.anything(),
                        }),
                        end: jasmine.objectContaining({
                            line: jasmine.anything(),
                            character: jasmine.anything(),
                        }),
                    },
                    uri: jasmine.objectContaining({
                        fsPath: test.uri.fsPath,
                    }),
                },
                actual
            )
        );
    };

    it('class', async () => {
        const suite = await getTestSuite();

        expectTest(suite, {
            kind: 'class',
            method: '',
        });
    });

    it('passed', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_passed',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('failed', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_failed',
            depends: ['test_passed'],
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('test_isnt_same', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_isnt_same',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('test_risky', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_risky',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('annotation_test', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'annotation_test',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('test_skipped', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_skipped',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('test_incomplete', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'test_incomplete',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('addition_provider', async () => {
        const suite = await getTestSuite();

        const expected = {
            method: 'addition_provider',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('parse TextDocument', async () => {
        const parser = new Parser();

        const suites = parser.parseTextDocument(
            TextDocument.create(
                file.toString(),
                'php',
                1,
                await files.get(file)
            )
        );

        expect(suites).toBeDefined();
    });

    it('leading comments', async () => {
        const suite = await getTestSuite(
            projectPath('tests/LeadingCommentsTest.php')
        );

        const expected = {
            class: 'LeadingCommentsTest',
            method: 'firstLeadingComments',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('has property', async () => {
        const suite = await getTestSuite(
            projectPath('tests/HasPropertyTest.php')
        );

        const expected = {
            class: 'HasPropertyTest',
            method: 'property',
        };

        await expectTest(getTest(suite, expected), expected);
    });

    it('parse code error', () => {
        const parser = new Parser();

        expect(parser.parseCode('a"bcde', URI.parse('/usr/bin'))).toEqual([]);
    });

    it('class as codelens', async () => {
        const suite = await getTestSuite();

        expect(suite.asCodeLens()).toEqual({
            range: suite.range,
            command: {
                title: 'Run Test',
                command: 'phpunit.lsp.test.nearest',
                arguments: [file.toString(), suite.range.start],
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
                command: 'phpunit.lsp.test.nearest',
                arguments: [file.toString(), test.range.start],
            },
        });
    });

    it('class as arguments', async () => {
        const suite = await getTestSuite();

        expect(suite.asArguments()).toEqual([file.fsPath]);
    });

    it('method as arguments', async () => {
        const suite = await getTestSuite();

        const test = getTest(suite, {
            method: 'test_failed',
            depends: ['test_passed'],
        });

        expect(test.asArguments()).toEqual([
            file.fsPath,
            '--filter',
            '^.*::(test_passed|test_failed)( with data set .*)?$',
        ]);
    });
});
