import Parser, { Test } from '../src/Parser';
import URI from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import files from '../src/Filesystem';
import { projectPath } from './helpers';

describe('Parser', () => {
    const parser = new Parser();
    const file = projectPath('tests/AssertionsTest.php');
    let tests: Test[] = [];

    const getTest = async (options: any = {}, testfile: URI = file) => {
        tests = await parser.parse(testfile);

        return tests.find(test => {
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

    const expectTest = async (actual: any, testfile: URI = file) => {
        const test = await getTest(actual, testfile);

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
                        fsPath: testfile.fsPath,
                    }),
                },
                actual
            )
        );
    };

    it('class', async () => {
        await expectTest({
            kind: 'class',
            method: '',
        });
    });

    it('passed', async () => {
        await expectTest({
            method: 'test_passed',
        });
    });

    it('failed', async () => {
        await expectTest({
            method: 'test_failed',
            depends: ['test_passed'],
        });
    });

    it('test_isnt_same', async () => {
        await expectTest({
            method: 'test_isnt_same',
        });
    });

    it('test_risky', async () => {
        await expectTest({
            method: 'test_risky',
        });
    });

    it('annotation_test', async () => {
        await expectTest({
            method: 'annotation_test',
        });
    });

    it('test_skipped', async () => {
        await expectTest({
            method: 'test_skipped',
        });
    });

    it('test_incomplete', async () => {
        await expectTest({
            method: 'test_incomplete',
        });
    });

    it('addition_provider', async () => {
        await expectTest({
            method: 'addition_provider',
        });
    });

    it('parse TextDocument', async () => {
        const parser = new Parser();

        const tests = parser.parseTextDocument(
            TextDocument.create(
                file.toString(),
                'php',
                1,
                await files.get(file)
            )
        );

        expect(tests).toBeDefined();
    });

    it('parse code error', () => {
        const parser = new Parser();

        expect(parser.parseCode('a"bcde', URI.parse('/usr/bin'))).toEqual([]);
    });

    it('class as codelens', async () => {
        const test = await getTest({
            kind: 'class',
            method: '',
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

    it('method as codelens', async () => {
        const test = await getTest({
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
        const test = await getTest({
            kind: 'class',
            method: '',
        });

        expect(test.asArguments()).toEqual([file.fsPath]);
    });

    it('method as arguments', async () => {
        const test = await getTest({
            method: 'test_failed',
            depends: ['test_passed'],
        });

        expect(test.asArguments()).toEqual([
            file.fsPath,
            '--filter',
            '^.*::(test_passed|test_failed)( with data set .*)?$',
        ]);
    });

    it('leading comments', async () => {
        await expectTest(
            {
                class: 'LeadingCommentsTest',
                method: 'firstLeadingComments',
            },
            projectPath('tests/LeadingCommentsTest.php')
        );
    });
});
