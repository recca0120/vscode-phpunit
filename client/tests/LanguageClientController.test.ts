import { Configuration } from '../src/Configuration';
import { LanguageClientController } from '../src/LanguageClientController';
import { Command } from 'vscode-languageclient';

describe('LanguageClientController', () => {
    const config = {
        get: () => {},
    };

    const workspace: any = {
        getConfiguration: () => {
            return config;
        },
    };
    const outputChannel: any = {
        clear: () => {},
    };

    const commands: any = {
        commands: {},
        registerTextEditorCommand: (name: string, cb: Function) => {
            commands.commands[name] = cb;
        },
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

    const client: any = {
        commands: {},
        notifications: {},
        onReady: () => {
            return Promise.resolve(true);
        },
        onNotification: (name: string, cb: Function) => {
            client.notifications[name] = cb;
        },
        sendRequest: (_type: any, command: Command) => {
            client.commands[command.command] = command;
        },
    };

    const sendCommand = async (name: string) => {
        await commands.commands[name](textEditor);

        return client.commands[name.replace(/phpunit\./, 'phpunit.lsp.')];
    };

    const sendNotification = (type: string) => {
        client.notifications[type]();
    };

    const configuration = new Configuration(workspace);
    let controller: LanguageClientController;

    beforeEach(() => {
        controller = new LanguageClientController(
            client,
            configuration,
            outputChannel,
            commands
        );
        controller.init();
    });

    it('execute run all', async () => {
        expect(await sendCommand('phpunit.run-all')).toEqual({
            command: 'phpunit.lsp.run-all',
            arguments: ['foo.php', 0],
        });
    });

    it('execute rerun', async () => {
        expect(await sendCommand('phpunit.rerun')).toEqual({
            command: 'phpunit.lsp.rerun',
            arguments: ['foo.php', 0],
        });
    });

    it('execute run file', async () => {
        expect(await sendCommand('phpunit.run-file')).toEqual({
            command: 'phpunit.lsp.run-file',
            arguments: ['foo.php', 0],
        });
    });

    it('execute run test at cursor', async () => {
        expect(await sendCommand('phpunit.run-test-at-cursor')).toEqual({
            command: 'phpunit.lsp.run-test-at-cursor',
            arguments: ['foo.php', 0],
        });
    });

    it('execute cancel', async () => {
        expect(await sendCommand('phpunit.cancel')).toEqual({
            command: 'phpunit.lsp.cancel',
            arguments: ['foo.php', 0],
        });
    });

    it('on test run started event', () => {
        spyOn(config, 'get').and.returnValue(true);
        spyOn(outputChannel, 'clear');

        sendNotification('TestRunStartedEvent');

        expect(outputChannel.clear).toBeCalled();
    });
});
