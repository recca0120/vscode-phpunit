import { LangServer } from './../src/lang-server';
import { IConnection, TextDocuments, createConnection } from 'vscode-languageserver';
import { PhpUnit, Cli, JUnitCollection } from './../src/phpunit';
import { TextDocument, Diagnostic } from 'vscode-languageserver-types';

const fn = () => {};

describe('Server Test', () => {
    const connection: IConnection = {
        onInitialize: fn,
        onDidChangeConfiguration: fn,
        onCodeLens: fn,
        onExecuteCommand: fn,
        onRequest: fn,
        onDocumentSymbol: fn,
        sendNotification: fn,
        sendDiagnostics: fn,
        onCompletion: fn,
        onCompletionResolve: fn,
        console: {
            log: fn,
        },
        listen: fn,
    } as any;

    const documents: TextDocuments = {
        syncKind: 1,
        get: fn,
        listen: fn,
    } as any;

    const cli: Cli = new Cli();
    const jUnits: JUnitCollection = new JUnitCollection();

    it('it should initial server', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        spyOn(documents, 'listen');
        spyOn(connection, 'onInitialize');
        spyOn(connection, 'onDidChangeConfiguration');
        spyOn(connection, 'onCodeLens');
        spyOn(connection, 'onRequest');
        spyOn(connection, 'onDocumentSymbol');
        spyOn(connection, 'listen');

        langServer.init().listen();

        expect(documents.listen).toBeCalledWith(connection);
        expect(connection.onInitialize).toHaveBeenCalledTimes(1);
        expect(connection.onDidChangeConfiguration).toHaveBeenCalledTimes(1);
        expect(connection.onCodeLens).toHaveBeenCalledTimes(1);
        expect(connection.onRequest).toHaveBeenCalledTimes(1);
        expect(connection.onDocumentSymbol).toHaveBeenCalledTimes(1);
        expect(connection.listen).toHaveBeenCalledTimes(1);
    });

    it('it should recieve initialize params', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        spyOn(connection, 'onInitialize').and.callFake(cb => {
            expect(cb()).toEqual({
                capabilities: {
                    textDocumentSync: documents.syncKind,
                    completionProvider: {
                        resolveProvider: true,
                    },
                    codeLensProvider: {
                        resolveProvider: true,
                    },
                    documentSymbolProvider: true,
                    executeCommandProvider: {
                        commands: [
                            'phpunit.test',
                            'phpunit.test.file',
                            'phpunit.test.suite',
                            'phpunit.test.nearest',
                            'phpunit.test.last',
                        ],
                    },
                },
            });
        });

        langServer.init();
    });

    it('it should change phpunit settings', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        spyOn(connection, 'onDidChangeConfiguration').and.callFake(cb => {
            spyOn(phpUnit, 'setBinary').and.returnValue(phpUnit);
            spyOn(phpUnit, 'setDefault');
            cb({
                settings: {
                    phpunit: {
                        execPath: 'path/to/phpunit',
                        args: ['foo', 'bar'],
                    },
                },
            } as any);
        });

        langServer.init();

        expect(phpUnit.setBinary).toBeCalledWith('path/to/phpunit');
        expect(phpUnit.setDefault).toBeCalledWith(['foo', 'bar']);
    });

    it('it should change codelens', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        spyOn(connection, 'onCodeLens').and.callFake(cb => {
            spyOn(documents, 'get').and.returnValue({
                uri: '/path/to/test.php',
                getText: () => 'text',
            });

            cb({
                textDocument: {
                    uri: '/path/to/test.php',
                },
            } as any);
        });

        langServer.init();

        expect(documents.get).toBeCalledWith('/path/to/test.php');
    });

    it('send assertions when get request assertion', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        spyOn(connection, 'sendNotification');
        spyOn(connection, 'onRequest').and.callFake((name: string, cb) => {
            cb({
                uri: 'file:///document/uri',
            });

            expect(name).toEqual('assertions');
            expect(connection.sendNotification).toBeCalledWith('assertions', {
                assertions: [],
                uri: 'file:///document/uri',
            });
        });

        langServer.init();
    });

    describe('ExecuteCommand Test', () => {
        const phpUnit: PhpUnit = new PhpUnit();
        const langServer: LangServer = new LangServer(connection, documents, phpUnit);

        beforeEach(() => {
            spyOn(connection, 'sendNotification');

            spyOn(phpUnit, 'getDiagnoics').and.returnValue(new Map<string, Diagnostic[]>([['document/uri', []]]));

            spyOn(phpUnit, 'getState').and.returnValue({
                failed: 1,
                passed: 0,
                warning: 3,
            });

            spyOn(connection, 'sendDiagnostics');

            spyOn(phpUnit, 'getOutput').and.callThrough();

            spyOn(connection.console, 'log');
        });

        afterEach(() => {
            expect(connection.sendNotification).toHaveBeenCalledWith('running');

            expect(connection.sendDiagnostics).toBeCalledWith({
                uri: 'document/uri',
                diagnostics: [],
            });

            expect(connection.sendNotification).toHaveBeenCalledWith('assertions', {
                uri: 'file:///document/uri',
                assertions: [],
            });

            expect(connection.sendNotification).toHaveBeenCalledWith('done', {
                failed: 1,
                passed: 0,
                warning: 3,
            });

            expect(connection.console.log).toBeCalledWith('');
        });

        it('it shound execute phpunit.test', async () => {
            spyOn(phpUnit, 'run');

            spyOn(connection, 'onExecuteCommand').and.callFake(async cb => {
                await cb({
                    command: 'phpunit.test',
                    arguments: ['document/uri', '/path/to/test.php', ['foo', 'bar']],
                });

                expect(phpUnit.run).toBeCalledWith('/path/to/test.php', ['foo', 'bar']);
            });

            langServer.init();
        });

        it('it shound execute phpunit.test.nearest', async () => {
            spyOn(phpUnit, 'runNearest');

            spyOn(connection, 'onExecuteCommand').and.callFake(async cb => {
                await cb({
                    command: 'phpunit.test.nearest',
                    arguments: ['document/uri', '/path/to/test.php', ['foo', 'bar']],
                });

                expect(phpUnit.runNearest).toBeCalledWith('/path/to/test.php', ['foo', 'bar']);
            });

            langServer.init();
        });

        it('it shound execute phpunit.test.last', async () => {
            spyOn(phpUnit, 'runLast');

            spyOn(connection, 'onExecuteCommand').and.callFake(async cb => {
                await cb({
                    command: 'phpunit.test.last',
                    arguments: ['document/uri', '/path/to/test.php', ['foo', 'bar']],
                });

                expect(phpUnit.runLast).toBeCalledWith('/path/to/test.php', ['foo', 'bar']);
            });

            langServer.init();
        });
    });
});
