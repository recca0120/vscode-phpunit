import { CommandRegister } from '../src/CommandRegister';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';

function givenClient() {
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

    spyOn(client, 'sendRequest');

    return client;
}

function givenCommands(uri: string, position: any) {
    const commands: any = {
        registerTextEditorCommand: (command: string, callback: () => {}) => {},
    };

    spyOn(commands, 'registerTextEditorCommand').and.callFake((command, cb) =>
        cb({
            document: {
                uri: uri,
                languageId: 'php',
            },
            selection: {
                active: position,
            },
        })
    );

    return commands;
}

function expectClientSendRequest(client: any, command: string, args: any[]) {
    expect(client.sendRequest).toBeCalledWith(ExecuteCommandRequest.type, {
        command: command.replace(/^phpunit/, 'phpunit.lsp'),
        arguments: args,
    });
}

function expectRegisterTextEditorCommand(callback: Function, expected: any) {
    const commands = givenCommands(expected.uri, expected.position);
    const client = givenClient();

    callback(client, commands);

    expect(commands.registerTextEditorCommand).toBeCalledWith(
        expected.command,
        jasmine.any(Function)
    );
    expectClientSendRequest(client, expected.command, [
        expected.uri,
        expected.position,
    ]);
}

describe('commands', () => {
    it('register test suite', () => {
        const expected = {
            command: 'phpunit.test.suite',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterTextEditorCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerRunSuite();
        }, expected);
    });

    it('register test nearest', () => {
        const expected = {
            command: 'phpunit.test.nearest',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterTextEditorCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerRunNearest();
        }, expected);
    });

    it('register run last', () => {
        const expected = {
            command: 'phpunit.test.last',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterTextEditorCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerRunLast();
        }, expected);
    });

    // it('register start streaming', () => {
    //     const commands: any = {
    //         registerCommand: () => {},
    //     };
    //     spyOn(commands, 'registerCommand').and.callFake(
    //         (command: any, cb: any) => {
    //             cb();
    //         }
    //     );

    //     const outputChannel: any = {
    //         listen: () => {},
    //     };

    //     spyOn(outputChannel, 'listen');

    //     const commandRegister = new CommandRegister(givenClient(), commands);
    //     commandRegister.registerStartStraming(outputChannel);

    //     expect(commands.registerCommand).toBeCalledWith(
    //         'phpunit.startStreaming',
    //         jasmine.any(Function)
    //     );
    //     expect(outputChannel.listen).toBeCalled();
    // });
});
