import { Window } from './wrappers/window';
import { Commands } from './wrappers/commands';
import { Disposable, TextEditor } from 'vscode';
import { LanguageClient, ExecuteCommandRequest } from 'vscode-languageclient';

export class CommandRegister {
    private isReady: boolean = false;
    private disposables: Disposable[] = [];

    constructor(
        private client: LanguageClient,
        private window: Window = new Window(),
        private commands: Commands = new Commands()
    ) {}

    register(): CommandRegister {
        this.registerTextEditorCommand('phpunit.client.test.suite', (command: string) => {
            this.sendRequest({
                command: command,
                arguments: [
                    {
                        uri: this.window.activeTextEditor.document.uri.toString(),
                        args: [],
                    },
                ],
            });
        });

        this.registerTextEditorCommand('phpunit.client.test.file', (command: string) => {
            this.sendRequest({
                command: command,
                arguments: [
                    {
                        uri: this.window.activeTextEditor.document.uri.toString(),
                        args: [],
                    },
                ],
            });
        });

        this.registerTextEditorCommand('phpunit.client.test.nearest', (command: string) => {
            this.sendRequest({
                command: command,
                arguments: [
                    {
                        uri: this.window.activeTextEditor.document.uri.toString(),
                        args: [],
                    },
                    this.window.activeTextEditor.selection.active.line,
                ],
            });
        });

        this.registerTextEditorCommand('phpunit.client.test.last', (command: string) => {
            this.sendRequest({
                command: command,
                arguments: [
                    {
                        uri: this.window.activeTextEditor.document.uri.toString(),
                        args: [],
                    },
                ],
            });
        });

        this.registerCommand('show.outputchannel', () => {
            this.client.outputChannel.show();
        });

        return this;
    }

    listen() {
        this.isReady = true;
    }

    dispose(): Disposable[] {
        return this.disposables;
    }

    private registerCommand(command: string, callback: Function) {
        this.disposables.push(
            this.commands.registerCommand(command, () => {
                callback(command.replace(/^phpunit\.client/, 'phpunit'));
            })
        );
    }

    private registerTextEditorCommand(command: string, callback: Function) {
        this.disposables.push(
            this.commands.registerTextEditorCommand(command, () => {
                const editor: TextEditor = this.window.activeTextEditor;
                if (!editor) {
                    return;
                }

                callback(command.replace(/^phpunit\.client/, 'phpunit'));
            })
        );
    }

    private sendRequest(command: any) {
        if (this.isReady === false) {
            return;
        }

        this.client.sendRequest(
            ExecuteCommandRequest.type,
            Object.assign(
                {
                    title: '',
                    command: '',
                    arguments: [
                        {
                            path: '',
                            args: [],
                        },
                    ],
                },
                command
            )
        );
    }
}
