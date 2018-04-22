import { ExecuteCommandRequest, LanguageClient, Command } from 'vscode-languageclient';
import { window as win, commands as cmds, TextEditor } from 'vscode';
import { when, tap } from './helpers';

export class CommandRegister {
    private disposables: any[] = [];
    private isReady: boolean = false;

    constructor(private client: LanguageClient, private window = win, private commands: any = cmds) {}

    register(): CommandRegister {
        return tap(this, () => {
            this.registerCommand('phpunit.client.test', (command: string, uri: string, editor: TextEditor) => {
                this.execute({ command: `${command}.nearest`, arguments: [uri, uri, [editor.selection.active.line]] });
            });

            this.registerCommand('phpunit.client.test.file', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, uri, []] });
            });

            this.registerCommand('phpunit.client.test.suite', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, '', []] });
            });

            this.registerCommand('phpunit.client.test.nearest', (command: string, uri: string, editor: TextEditor) => {
                this.execute({ command: command, arguments: [uri, uri, [editor.selection.active.line]] });
            });

            this.registerCommand('phpunit.client.test.last', (command: string, uri: string) => {
                this.execute({ command: command, arguments: [uri, uri, []] });
            });
        });
    }

    ready(): CommandRegister {
        this.isReady = true;

        return this;
    }

    dispose(): any {
        return this.disposables;
    }

    private registerCommand(command: string, cb: Function = () => {}) {
        this.disposables.push(
            this.commands.registerTextEditorCommand(command, () => {
                when(this.window.activeTextEditor, (editor: TextEditor) => {
                    cb(command.replace(/^phpunit\.client/, 'phpunit'), editor.document.uri.toString(), editor);
                });
            })
        );
    }

    private execute(command: any) {
        if (this.isReady === false) {
            return;
        }

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
