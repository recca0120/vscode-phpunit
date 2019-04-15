import { join } from 'path';
import Parser, { Test } from '../src/phpunit-parser';
import URI from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import { Filesystem } from '../src/filesystem';

describe('parse phpunit', () => {
    const parser = new Parser();
    const file = join(
        __dirname,
        'fixtures/project-sub/tests/AssertionsTest.php'
    );
    let index = 0;

    const getTest = async (key: number) => {
        const tests = await parser.parse(file);

        return tests[key];
    };

    const expectTest = async (test: Test, actual: any) => {
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
                        fsPath: file,
                    }),
                },
                actual
            )
        );
    };

    it('class', async () => {
        expectTest(await getTest(index++), {
            kind: 'class',
        });
    });

    it('passed', async () => {
        expectTest(await getTest(index++), {
            method: 'test_passed',
        });
    });

    it('failed', async () => {
        expectTest(await getTest(index++), {
            method: 'test_failed',
            depends: ['test_passed'],
        });
    });

    it('test_isnt_same', async () => {
        expectTest(await getTest(index++), {
            method: 'test_isnt_same',
        });
    });

    it('test_risky', async () => {
        expectTest(await getTest(index++), {
            method: 'test_risky',
        });
    });

    it('annotation_test', async () => {
        expectTest(await getTest(index++), {
            method: 'annotation_test',
        });
    });

    it('test_skipped', async () => {
        expectTest(await getTest(index++), {
            method: 'test_skipped',
        });
    });

    it('test_incomplete', async () => {
        expectTest(await getTest(index++), {
            method: 'test_incomplete',
        });
    });

    it('addition_provider', async () => {
        expectTest(await getTest(index++), {
            method: 'addition_provider',
        });
    });

    it('parse TextDocument', async () => {
        const parser = new Parser();

        const tests = parser.parseTextDocument(
            TextDocument.create(
                file,
                'php',
                1,
                await new Filesystem().get(file)
            )
        );

        expect(tests).toBeDefined();
    });

    it('parse code error', () => {
        const parser = new Parser();

        expect(parser.parseCode('a"bcde', URI.parse('/usr/bin'))).toEqual([]);
    });

    it('class as codelens', async () => {
        const test = await getTest(0);

        expect(test.asCodeLens()).toEqual({
            range: test.range,
            command: {
                title: 'Run Test',
                command: 'phpunit.Test',
                arguments: [file],
            },
        });
    });

    it('method as codelens', async () => {
        const test = await getTest(2);

        expect(test.asCodeLens()).toEqual({
            range: test.range,
            command: {
                title: 'Run Test',
                command: 'phpunit.TestNearest',
                arguments: [
                    file,
                    '--filter',
                    '^.*::(test_passed|test_failed)( with data set .*)?$',
                ],
            },
        });
    });
});
