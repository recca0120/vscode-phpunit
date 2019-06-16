import { commands, Disposable, OutputChannel, TextEditor } from 'vscode';
import { Configuration } from './Configuration';
import { ExecuteCommandRequest } from 'vscode-languageserver-protocol';
import { LanguageClient } from 'vscode-languageclient';
import { TestEvent } from 'vscode-test-adapter-api';
import { Notify } from './Notify';

export class LanguageClientController implements Disposable {
    private disposables: Disposable[] = [];

    constructor(
        private client: LanguageClient,
        private config: Configuration,
        private outputChannel: OutputChannel,
        private notify: Notify,
        private _commands = commands
    ) {}

    init() {
        this.runAll();
        this.rerun();
        this.runFile();
        this.runTestAtCursor();
        this.cancel();
        this.onTestRunStartedEvent();
        this.onTestRunFinishedEvent();

        return this;
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    private async onTestRunStartedEvent() {
        await this.client.onReady();

        this.client.onNotification('TestRunStartedEvent', () => {
            this.notify.show('PHPUnit Running');

            if (this.config.clearOutputOnRun === true) {
                this.outputChannel.clear();
            }
        });
    }

    private async onTestRunFinishedEvent() {
        await this.client.onReady();

        this.client.onNotification('TestRunFinishedEvent', ({ events }) => {
            this.notify.hide();

            const showAfterExecution = this.config.showAfterExecution;

            const hasFailure = (events: TestEvent[]) => {
                return events.some(event =>
                    ['failed', 'errored'].includes(event.state)
                );
            };

            if (showAfterExecution === 'never') {
                return;
            }

            if (showAfterExecution === 'always' || hasFailure(events)) {
                this.outputChannel.show(true);
            }
        });
    }

    private runAll() {
        this.registerCommand('phpunit.run-all');
    }

    private rerun() {
        this.registerCommand('phpunit.rerun');
    }

    private runFile() {
        this.registerCommand('phpunit.run-file');
    }

    private runTestAtCursor() {
        this.registerCommand('phpunit.run-test-at-cursor');
    }

    private cancel() {
        this.registerCommand('phpunit.cancel');
    }

    private registerCommand(command: string) {
        this.disposables.push(
            this._commands.registerTextEditorCommand(
                command,
                async textEditor => {
                    await this.client.onReady();

                    if (this.isValidTextEditor(textEditor) === false) {
                        return;
                    }

                    const document = textEditor.document;

                    this.client.sendRequest(ExecuteCommandRequest.type, {
                        command: command.replace(/^phpunit/, 'phpunit.lsp'),
                        arguments: [
                            document.uri.toString(),
                            document.uri.toString(),
                            textEditor.selection.active.line,
                        ],
                    });
                }
            )
        );
    }

    private isValidTextEditor(editor: TextEditor): boolean {
        if (!editor || !editor.document) {
            return false;
        }

        return editor.document.languageId === 'php';
    }
}
