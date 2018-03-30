import { SymbolInformation, TextDocument, SymbolKind } from 'vscode-languageserver';

import { DocumentSymbolProvider } from '../../src/providers';
import { Filesystem } from '../../src/filesystem';
import { resolve } from 'path';
import { readFileSync } from 'fs';

describe('DocumentSymbolProvider Test', () => {
    const path: string = resolve(__dirname, '../fixtures/PHPUnitTest.php');
    let symbolInformations: SymbolInformation[] = [];

    beforeEach(async () => {
        const documentSymbolProvider: DocumentSymbolProvider = new DocumentSymbolProvider();
        const textDocument: TextDocument = TextDocument.create(path, 'php', 0.1, readFileSync(path).toString('utf8'));
        symbolInformations = documentSymbolProvider.provideDocumentSymbols(textDocument);
    });

    it('it should resolve class PHPUnitTest symbolInformations', () => {
        expect(symbolInformations[0]).toEqual({
            kind: SymbolKind.Class,
            location: {
                range: {
                    end: {
                        character: 11,
                        line: 5,
                    },
                    start: {
                        character: 0,
                        line: 5,
                    },
                },
                uri: path,
            },
            name: 'PHPUnitTest',
        });
    });

    it('it should resolve method testPassed symbolInformations', () => {
        expect(symbolInformations[1]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 21,
                        line: 12,
                    },
                    start: {
                        character: 11,
                        line: 12,
                    },
                },
                uri: path,
            },
            name: 'testPassed',
        });
    });

    it('it should resolve method testFailed symbolInformations', () => {
        expect(symbolInformations[2]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 21,
                        line: 17,
                    },
                    start: {
                        character: 11,
                        line: 17,
                    },
                },
                uri: path,
            },
            name: 'testFailed',
        });
    });

    it('it should resolve method testSkipped symbolInformations', () => {
        expect(symbolInformations[3]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 22,
                        line: 22,
                    },
                    start: {
                        character: 11,
                        line: 22,
                    },
                },
                uri: path,
            },
            name: 'testSkipped',
        });
    });

    it('it should resolve method testIncomplete symbolInformations', () => {
        expect(symbolInformations[4]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 25,
                        line: 27,
                    },
                    start: {
                        character: 11,
                        line: 27,
                    },
                },
                uri: path,
            },
            name: 'testIncomplete',
        });
    });

    it('it should resolve method testNoAssertions symbolInformations', () => {
        expect(symbolInformations[5]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 27,
                        line: 32,
                    },
                    start: {
                        character: 11,
                        line: 32,
                    },
                },
                uri: path,
            },
            name: 'testNoAssertions',
        });
    });

    it('it should resolve method testAssertNotEquals symbolInformations', () => {
        expect(symbolInformations[6]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 30,
                        line: 37,
                    },
                    start: {
                        character: 11,
                        line: 37,
                    },
                },
                uri: path,
            },
            name: 'testAssertNotEquals',
        });
    });

    it('it should resolve method it_should_be_test_case symbolInformations', () => {
        expect(symbolInformations[7]).toEqual({
            kind: SymbolKind.Method,
            location: {
                range: {
                    end: {
                        character: 33,
                        line: 46,
                    },
                    start: {
                        character: 11,
                        line: 46,
                    },
                },
                uri: path,
            },
            name: 'it_should_be_test_case',
        });
    });

    it('it should resolve class PHPUnitTest2 with namespace symbolInformations', () => {
        const path = resolve(__dirname, '../fixtures/PHPUnit2Test.php');
        const documentSymbolProvider: DocumentSymbolProvider = new DocumentSymbolProvider();
        const textDocument: TextDocument = TextDocument.create(path, 'php', 0.1, readFileSync(path).toString('utf8'));
        symbolInformations = documentSymbolProvider.provideDocumentSymbols(textDocument);

        expect(symbolInformations[0]).toEqual({
            kind: SymbolKind.Class,
            location: {
                range: {
                    end: {
                        character: 12,
                        line: 7,
                    },
                    start: {
                        character: 0,
                        line: 7,
                    },
                },
                uri: path,
            },
            "name": "PHPUnit2Test"
        });
    });
});
