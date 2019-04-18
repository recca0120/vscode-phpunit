import { TextEditor } from 'vscode';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';

export class CommandRegister {
    private enabled = false;
    constructor(private client: LanguageClient, private commands: any) {
        this.client.onReady().then(() => {
            this.enabled = true;
        });
    }

    registerTest() {
        return this.register('phpunit.test');
    }

    registerNearestTest() {
        return this.register('phpunit.testNearest');
    }

    registerRerunLastTest() {
        return this.register('phpunit.RerunLastTest');
    }

    private register(command: string) {
        return this.commands.registerTextEditorCommand(
            command,
            (textEditor: TextEditor) => {
                if (this.enabled === true) {
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
