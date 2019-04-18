import { CommandRegister } from '../src/command-register';
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
        cb(givenTextEditor(uri, position))
    );

    return commands;
}

function givenTextEditor(uri: string, position: any): any {
    return {
        document: {
            uri: uri,
        },
        selection: {
            active: position,
        },
    };
}

function expectRegisterTextEditorCommand(commands: any, command: string) {
    expect(commands.registerTextEditorCommand).toBeCalledWith(
        command,
        jasmine.any(Function)
    );
}

function expectClientSendRequest(client: any, command: string, args: any[]) {
    expect(client.sendRequest).toBeCalledWith(ExecuteCommandRequest.type, {
        command: command.replace(/^phpunit/, 'phpunit.lsp'),
        arguments: args,
    });
}

function expectRegisterCommand(callback: Function, expected: any) {
    const commands = givenCommands(expected.uri, expected.position);
    const client = givenClient();

    callback(client, commands);

    expectRegisterTextEditorCommand(commands, expected.command);
    expectClientSendRequest(client, expected.command, [
        expected.uri,
        expected.position,
    ]);
}

describe('commands', () => {
    it('register test', () => {
        const expected = {
            command: 'phpunit.test',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerTest();
        }, expected);
    });

    it('register test nearest', () => {
        const expected = {
            command: 'phpunit.testNearest',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerNearestTest();
        }, expected);
    });

    it('register rerun last test', () => {
        const expected = {
            command: 'phpunit.RerunLastTest',
            uri: 'foo.php',
            position: {
                line: 0,
                character: 0,
            },
        };

        expectRegisterCommand((client: any, commands: any) => {
            const commandRegister = new CommandRegister(client, commands);
            commandRegister.registerRerunLastTest();
        }, expected);
    });
});
