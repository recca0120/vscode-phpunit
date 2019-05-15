import { commands, TextEditor, Disposable } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';

export class CommandRequest {
    private enabled = false;

    constructor(private client: LanguageClient, private _commands = commands) {
        this.client.onReady().then(() => {
            this.enabled = true;
        });
    }

    runAll(): Disposable {
        return this.registerCommand('phpunit.run-all');
    }

    rerun(): Disposable {
        return this.registerCommand('phpunit.rerun');
    }

    runFile(): Disposable {
        return this.registerCommand('phpunit.run-file');
    }

    runTestAtCursor(): Disposable {
        return this.registerCommand('phpunit.run-test-at-cursor');
    }

    cancel(): Disposable {
        return this.registerCommand('phpunit.cancel');
    }

    private registerCommand(command: string): Disposable {
        return this._commands.registerTextEditorCommand(command, textEditor => {
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
        });
    }

    private isValidTextEditor(editor: TextEditor): boolean {
        if (!this.enabled || !editor || !editor.document) {
            return false;
        }

        return editor.document.languageId === 'php';
    }
}
