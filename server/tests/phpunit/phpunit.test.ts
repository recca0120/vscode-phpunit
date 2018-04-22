import { PhpUnit, Cli, Parameters, JUnit, Process } from '../../src/phpunit';
import { FilesystemContract, POSIX, Filesystem } from '../../src/filesystem';
import { normalize } from 'path';
import { projectPath } from '../helpers';
import { CodeLens, SymbolInformation, SymbolKind } from 'vscode-languageserver-types';

describe('PHPUnit Test', () => {
    it('it should execute phpunit', async () => {
        const files: FilesystemContract = new POSIX();
        const process: Process = new Process();
        const parameters: Parameters = new Parameters();
        const jUnit: JUnit = new JUnit();
        const cli: Cli = new Cli(files, process, parameters, jUnit);
        const phpUnit: PhpUnit = new PhpUnit(cli);

        spyOn(cli, 'setBinary').and.callThrough();
        spyOn(cli, 'setDefault').and.callThrough();
        spyOn(process, 'spawn').and.callFake(() => {});
        spyOn(jUnit, 'parseFile').and.returnValue([[]]);

        await phpUnit
            .setBinary('path/to/phpunit')
            .setDefault(['foo'])
            .run('path/to/test', ['bar', '--log-junit', 'junit.xml']);

        expect(cli.setBinary).toBeCalledWith('path/to/phpunit');
        expect(cli.setDefault).toBeCalledWith(['foo']);
        expect(process.spawn).toBeCalledWith({
            title: '',
            command: 'path/to/phpunit',
            arguments: ['foo', 'bar', '--log-junit', 'junit.xml', 'path/to/test'],
        });

        await phpUnit.runLast();
        expect(process.spawn).toHaveBeenCalledTimes(2);
        expect(process.spawn).toHaveBeenLastCalledWith({
            title: '',
            command: 'path/to/phpunit',
            arguments: ['foo', 'bar', '--log-junit', 'junit.xml', 'path/to/test'],
        });
    });

    describe('CodeLen Test', () => {
        const files: FilesystemContract = new Filesystem();
        const phpUnit = new PhpUnit();
        const path: string = projectPath('tests/AssertionsTest.php').replace(/^C:/, 'c:');
        const uri: string = files.uri(path);
        let codeLens: CodeLens[] = [];

        beforeAll(async () => {
            const code: string = await files.get(path);
            codeLens = phpUnit.getCodeLens(code, uri);
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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
                    command: 'phpunit.test',
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

    describe('get Document Symbols', () => {
        const files: FilesystemContract = new Filesystem();
        const phpUnit = new PhpUnit();
        const path: string = projectPath('tests/AssertionsTest.php').replace(/^C:/, 'c:');
        const uri: string = files.uri(path);
        let symbolInformations: SymbolInformation[] = [];

        beforeAll(async () => {
            const code: string = await files.get(path);
            symbolInformations = phpUnit.getDocumentSymbols(code, uri);
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
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
                    uri: uri,
                },
                name: 'test_no_assertion',
            });
        });
    });
});
