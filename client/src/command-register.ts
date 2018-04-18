import { ExecuteCommandRequest, LanguageClient, Command } from 'vscode-languageclient';
import { commands, TextEditor } from 'vscode';
import { when, tap } from './helpers';

export class CommandRegister {
    private cmds: any;
    private disposables: any[] = [];

    constructor(private client: LanguageClient, cmds: any = null) {
        this.cmds = cmds || commands;
    }

    register(window: any): CommandRegister {
        return tap(this, () => {
            this.registerCommand(window, 'phpunit.client.test', (command: string, uri: string, editor: TextEditor) => {
                this.execute({ command: `${command}.nearest`, arguments: [uri, uri, [editor.selection.active.line]] });
            });

            this.registerCommand(window, 'phpunit.client.test.file', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, uri, []] });
            });

            this.registerCommand(window, 'phpunit.client.test.suite', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, '', []] });
            });

            this.registerCommand(
                window,
                'phpunit.client.test.nearest',
                (command: string, uri: string, editor: TextEditor) => {
                    this.execute({ command: command, arguments: [uri, uri, [editor.selection.active.line]] });
                }
            );

            this.registerCommand(window, 'phpunit.client.test.last', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, uri, []] });
            });
        });
    }

    dispose(): any {
        return this.disposables;
    }

    private registerCommand(window: any, command: string, cb: Function = () => {}) {
        this.disposables.push(
            this.cmds.registerTextEditorCommand(command, () => {
                when(window.activeTextEditor, (editor: TextEditor) => {
                    cb(command.replace(/^phpunit\.client/, 'phpunit'), editor.document.uri.toString(), editor);
                });
            })
        );
    }

    private execute(command: any) {
        this.client.sendRequest(ExecuteCommandRequest.type, Object.assign(
            {
                title: '',
                command: '',
                arguments: ['', '', []],
            },
            command
        ) as Command);
    }
}
