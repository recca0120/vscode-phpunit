import { TextEditor } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';
// import { SocketOutputChannel } from './SocketOutputChannel';

export class CommandRegister {
    private enabled = false;
    constructor(private client: LanguageClient, private commands: any) {
        this.client.onReady().then(() => {
            this.enabled = true;
        });
    }

    registerRunAll() {
        return this.registerPHPUnitCommand('phpunit.run-all');
    }

    registerRerun() {
        return this.registerPHPUnitCommand('phpunit.rerun');
    }

    registerRunFile() {
        return this.registerPHPUnitCommand('phpunit.run-file');
    }

    registerRunTestAtCursor() {
        return this.registerPHPUnitCommand('phpunit.run-test-at-cursor');
    }

    registerRunDirectory() {
        return this.registerPHPUnitCommand('phpunit.run-directory');
    }

    // registerStartStraming(outputChannel: SocketOutputChannel) {
    //     return this.commands.registerCommand('phpunit.startStreaming', () => {
    //         // Establish websocket connection
    //         outputChannel.listen();
    //     });
    // }

    private registerPHPUnitCommand(command: string) {
        return this.commands.registerTextEditorCommand(
            command,
            (textEditor: TextEditor) => {
                if (this.isValidTextEditor(textEditor) === false) {
                    return;
                }

                const document = textEditor.document;

                this.client.sendRequest(ExecuteCommandRequest.type, {
                    command: command.replace(/^phpunit/, 'phpunit.lsp'),
                    arguments: [
                        document.uri.toString(),
                        textEditor.selection.active,
                    ],
                });
            }
        );
    }

    private isValidTextEditor(textEditor: TextEditor): boolean {
        if (!this.enabled || !textEditor || !textEditor.document) {
            return false;
        }

        return textEditor.document.languageId === 'php';
    }
}
