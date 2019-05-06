import { TextEditor } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';
// import { SocketOutputChannel } from './SocketOutputChannel';

export class CommandRequest {
    private enabled = false;

    constructor(private client: LanguageClient, private commands: any) {
        this.client.onReady().then(() => {
            this.enabled = true;
        });
    }

    runAll() {
        return this.registerCommand('phpunit.run-all');
    }

    rerun() {
        return this.registerCommand('phpunit.rerun');
    }

    runFile() {
        return this.registerCommand('phpunit.run-file');
    }

    runTestAtCursor() {
        return this.registerCommand('phpunit.run-test-at-cursor');
    }

    runDirectory() {
        return this.registerCommand('phpunit.run-directory');
    }

    cancel() {
        return this.registerCommand('phpunit.cancel');
    }

    // registerStartStraming(outputChannel: SocketOutputChannel) {
    //     return this.commands.registerCommand('phpunit.startStreaming', () => {
    //         // Establish websocket connection
    //         outputChannel.listen();
    //     });
    // }

    private registerCommand(command: string) {
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
