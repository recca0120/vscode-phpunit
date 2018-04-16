import { DocumentSymbolProvider } from '../../src/providers';
import { Filesystem, FilesystemContract } from '../../src/filesystem';
import { projectPath } from '../helpers';
import { SymbolInformation, SymbolKind, TextDocument } from 'vscode-languageserver';

describe('DocumentSymbolProvider Test', () => {
    const path: string = projectPath('tests/AssertionsTest.php');
    const files: FilesystemContract = new Filesystem();
    let symbolInformations: SymbolInformation[] = [];

    beforeAll(async () => {
        const documentSymbolProvider: DocumentSymbolProvider = new DocumentSymbolProvider();
        const content = await files.get(path);
        const textDocument: TextDocument = TextDocument.create(path, 'php', 0.1, content);
        symbolInformations = documentSymbolProvider.provideDocumentSymbols(textDocument);
    });

    it('it should resolve class AssertionsTest', () => {
        expect(symbolInformations[0]).toEqual({
            kind: SymbolKind.Class,
            location: {
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
                uri: path,
            },
            name: 'AssertionsTest',
        });
    });

    it('it should resolve method test_passed', () => {
        expect(symbolInformations[1]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_passed',
        });
    });

    it('it should resolve method test_error', () => {
        expect(symbolInformations[2]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_error',
        });
    });

    it('it should resolve method test_assertion_isnt_same', () => {
        expect(symbolInformations[3]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_assertion_isnt_same',
        });
    });

    it('it should resolve method test_risky', () => {
        expect(symbolInformations[4]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_risky',
        });
    });

    it('it should resolve method it_should_be_annotation_test', () => {
        expect(symbolInformations[5]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'it_should_be_annotation_test',
        });
    });

    it('it should resolve method test_skipped', () => {
        expect(symbolInformations[6]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_skipped',
        });
    });

    it('it should resolve method test_incomplete', () => {
        expect(symbolInformations[7]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_incomplete',
        });
    });

    it('it should resolve method test_no_assertion', () => {
        expect(symbolInformations[8]).toEqual({
            kind: SymbolKind.Method,
            location: {
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
                uri: path,
            },
            name: 'test_no_assertion',
        });
    });
});
