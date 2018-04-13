import { projectPath } from '../helpers';
import { CodeLens, TextDocument } from 'vscode-languageserver';

import { CodeLensProvider } from '../../src/providers';
import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Runner } from '../../src/runner';

describe('CodeLensProvider Test', () => {
    const files: FilesystemContract = new Filesystem();
    const path: string = projectPath('tests/AssertionsTest.php').replace(/^C:/, 'c:');
    const uri: string = files.uri(path);
    let codeLens: CodeLens[] = [];

    beforeEach(async () => {
        const runner = new Runner();
        const codeLensProvider: CodeLensProvider = new CodeLensProvider(runner);
        const content: string = await files.get(path);
        const textDocument: TextDocument = TextDocument.create(uri, 'php', 0.1, content);
        codeLens = codeLensProvider.provideCodeLenses(textDocument);
    });

    it('it should resolve class AssertionsTest', () => {
        expect(codeLens[0]).toEqual({
            command: {
                arguments: [uri, path, []],
                command: 'phpunit.test.file',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 14,
                    line: 6,
                },
                start: {
                    character: 0,
                    line: 6,
                },
            },
        });
    });

    it('it should resolve method testPassed codelens', () => {
        expect(codeLens[1]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_passed$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 22,
                    line: 8,
                },
                start: {
                    character: 11,
                    line: 8,
                },
            },
        });
    });

    it('it should resolve method test_error', () => {
        expect(codeLens[2]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_error$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 21,
                    line: 13,
                },
                start: {
                    character: 11,
                    line: 13,
                },
            },
        });
    });

    it('it should resolve method test_assertion_isnt_same', () => {
        expect(codeLens[3]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_assertion_isnt_same$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 35,
                    line: 18,
                },
                start: {
                    character: 11,
                    line: 18,
                },
            },
        });
    });

    it('it should resolve method test_risky', () => {
        expect(codeLens[4]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_risky$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 21,
                    line: 23,
                },
                start: {
                    character: 11,
                    line: 23,
                },
            },
        });
    });

    it('it should resolve method it_should_be_annotation_test', () => {
        expect(codeLens[5]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::it_should_be_annotation_test$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 39,
                    line: 31,
                },
                start: {
                    character: 11,
                    line: 31,
                },
            },
        });
    });

    it('it should resolve method test_skipped', () => {
        expect(codeLens[6]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_skipped$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 23,
                    line: 36,
                },
                start: {
                    character: 11,
                    line: 36,
                },
            },
        });
    });

    it('it should resolve method test_incomplete', () => {
        expect(codeLens[7]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_incomplete$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 26,
                    line: 41,
                },
                start: {
                    character: 11,
                    line: 41,
                },
            },
        });
    });

    it('it should resolve method test_no_assertion', () => {
        expect(codeLens[8]).toEqual({
            command: {
                arguments: [uri, path, ['--filter', '^.*::test_no_assertion$']],
                command: 'phpunit.test.method',
                title: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: uri,
                },
            },
            range: {
                end: {
                    character: 28,
                    line: 46,
                },
                start: {
                    character: 11,
                    line: 46,
                },
            },
        });
    });
});
