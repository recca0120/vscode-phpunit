import { commands, TextEditor } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';

export class CommandRequest {
    private enabled = false;

    constructor(private client: LanguageClient, private _commands = commands) {
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

    cancel() {
        return this.registerCommand('phpunit.cancel');
    }

    private registerCommand(command: string) {
        return this._commands.registerTextEditorCommand(
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
                        textEditor.selection.active.line,
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
