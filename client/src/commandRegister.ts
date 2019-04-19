import { TextEditor } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';
import { SocketOutputChannel } from './socketOutputChannel';

export class CommandRegister {
    private enabled = false;
    constructor(private client: LanguageClient, private commands: any) {
        this.client.onReady().then(() => {
            this.enabled = true;
        });
    }

    registerRunSuite() {
        return this.registerPHPUnitCommand('phpunit.test.suite');
    }

    registerRunFile() {
        return this.registerPHPUnitCommand('phpunit.test.file');
    }

    registerRunNearest() {
        return this.registerPHPUnitCommand('phpunit.test.nearest');
    }

    registerRunLast() {
        return this.registerPHPUnitCommand('phpunit.test.last');
    }

    registerStartStraming(outputChannel: SocketOutputChannel) {
        return this.commands.registerCommand('phpunit.startStreaming', () => {
            // Establish websocket connection
            outputChannel.listen();
        });
    }

    private registerPHPUnitCommand(command: string) {
        return this.commands.registerTextEditorCommand(
            command,
            (textEditor: TextEditor) => {
                if (
                    textEditor &&
                    textEditor.document &&
                    this.enabled === true
                ) {
                    const document = textEditor.document;

                    this.client.sendRequest(ExecuteCommandRequest.type, {
                        command: command.replace(/^phpunit/, 'phpunit.lsp'),
                        arguments: [
                            document.uri.toString(),
                            textEditor.selection.active,
                        ],
                    });
                }
            }
        );
    }
}
