import { LangServer } from './../src/lang-server';
import { IConnection, TextDocuments, createConnection } from 'vscode-languageserver';
import { PhpUnit } from './../src/phpunit';
import { TextDocument } from 'vscode-languageserver-types';

const fn = () => {};

describe('Server Test', () => {
    const connection: IConnection = {
        onInitialize: fn,
        onDidChangeConfiguration: fn,
        onCodeLens: fn,
        onExecuteCommand: fn,
        onRequest: fn,
        onDocumentSymbol: fn,
        listen: fn,
    } as any;

    const documents: TextDocuments = {
        syncKind: 1,
        get: fn,
        listen: fn,
    } as any;

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
});
