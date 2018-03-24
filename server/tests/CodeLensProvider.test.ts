import { CodeLens, TextDocument } from 'vscode-languageserver';

import { CodeLensProvider } from './../src/CodeLensProvider';
import { Filesystem } from './../src/Filesystem';
import { resolve } from 'path';

describe('CodeLensProvider Test', () => {
    it('it should resolve codelens', () => {
        const codeLensProvider: CodeLensProvider = new CodeLensProvider();
        const path = resolve(__dirname, 'fixtures/PHPUnitTest.php');
        const textDocument: TextDocument = TextDocument.create(path, 'php', 0.1, new Filesystem().get(path));

        const codeLens: CodeLens[] = codeLensProvider.provideCodeLenses(textDocument);

        expect(codeLens[0]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 0,
                    line: 5,
                },
                start: {
                    character: 0,
                    line: 5,
                },
            },
        });

        expect(codeLens[1]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 12,
                },
                start: {
                    character: 11,
                    line: 12,
                },
            },
        });

        expect(codeLens[2]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 17,
                },
                start: {
                    character: 11,
                    line: 17,
                },
            },
        });

        expect(codeLens[3]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 22,
                },
                start: {
                    character: 11,
                    line: 22,
                },
            },
        });

        expect(codeLens[4]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 27,
                },
                start: {
                    character: 11,
                    line: 27,
                },
            },
        });

        expect(codeLens[5]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 32,
                },
                start: {
                    character: 11,
                    line: 32,
                },
            },
        });

        expect(codeLens[6]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
                    line: 37,
                },
                start: {
                    character: 11,
                    line: 37,
                },
            },
        });

        expect(codeLens[7]).toEqual({
            command: {
                command: 'a',
                title: 'Run Test',
                tooltip: 'Run Test',
            },
            data: {
                textDocument: {
                    uri: path,
                },
            },
            range: {
                end: {
                    character: 11,
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
