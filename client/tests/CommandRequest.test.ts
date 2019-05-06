import { CommandRequest } from '../src/CommandRequest';

class StubCommandRequest extends CommandRequest {
    [propName: string]: any;
}

describe('commands', () => {
    const expectedCalled = (command: any, expected: any) => {
        const client: any = {
            sendRequest: () => {},
            onReady: () => {
                return {
                    then: (cb: Function) => {
                        cb();
                    },
                };
            },
        };

        const commands: any = {
            registerTextEditorCommand: () => {},
        };

        const textEditor = {
            document: {
                uri: 'foo.php',
                languageId: 'php',
            },
            selection: {
                active: {
                    line: 0,
                    character: 0,
                },
            },
        };

        const commandRequest = new StubCommandRequest(client, commands);

        spyOn(commands, 'registerTextEditorCommand').and.callFake((...args) => {
            args[1](textEditor);
        });

        spyOn(client, 'sendRequest').and.callFake((...args) => {
            expect(args[1]).toEqual(
                jasmine.objectContaining(Object.assign({}, expected))
            );
        });

        commandRequest[command]();
    };

    it('run all', () => {
        expectedCalled('runAll', {
            command: 'phpunit.lsp.run-all',
        });
    });

    it('rerun', () => {
        expectedCalled('rerun', {
            command: 'phpunit.lsp.rerun',
        });
    });

    it('run file', () => {
        expectedCalled('runFile', {
            command: 'phpunit.lsp.run-file',
        });
    });

    it('run test at cursor', () => {
        expectedCalled('runTestAtCursor', {
            command: 'phpunit.lsp.run-test-at-cursor',
        });
    });

    it('run directory', () => {
        expectedCalled('runDirectory', {
            command: 'phpunit.lsp.run-directory',
        });
    });

    it('cancel', () => {
        expectedCalled('cancel', {
            command: 'phpunit.lsp.cancel',
        });
    });
});
