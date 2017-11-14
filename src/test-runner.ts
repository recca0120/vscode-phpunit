import { Disposable, TextDocument, TextDocumentWillSaveEvent, TextEditor } from 'vscode';
import { PHPUnit, State } from './command/phpunit';

import { Arguments } from './command/arguments';
import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { DelayHandler } from './delay-handler';
import { DiagnosticManager } from './diagnostic-manager';
import { StatusBar } from './status-bar';
import { Store } from './store';
import { Type } from './parsers/parser';
import { Validator } from './validator';

export interface TestRunnerOptions {
    container: Container;
    command: PHPUnit;
    statusBar: StatusBar;
    decorateManager: DecorateManager;
    diagnosticManager: DiagnosticManager;
}

export class TestRunner {
    private disposable: Disposable;
    private window: any;
    private workspace: any;
    private store: Store;
    private validator: Validator;
    private config: ConfigRepository;
    private commandDelayed: DelayHandler = new DelayHandler('PHPUnit Cancelled');

    private container: Container;
    private command: PHPUnit;
    private statusBar: StatusBar;
    private decorateManager: DecorateManager;
    private diagnosticManager: DiagnosticManager;

    constructor(options: TestRunnerOptions) {
        this.container = options.container;
        this.command = options.command;
        this.statusBar = options.statusBar;
        this.decorateManager = options.decorateManager;
        this.diagnosticManager = options.diagnosticManager;

        this.window = this.container.window;
        this.workspace = this.container.workspace;
        this.store = this.container.store;
        this.validator = this.container.validator;
        this.config = this.container.config;
    }

    subscribe(commands: any): this {
        const subscriptions: Disposable[] = [];

        this.window.onDidChangeActiveTextEditor(
            (editor: TextEditor) => {
                if (!editor) {
                    return;
                }

                const document: TextDocument = editor.document;

                this.commandDelayed.delay(100).then(() => {
                    this.decoratedGutter();

                    if (<boolean>this.config.get('testOnOpen') === false || this.store.has(document.uri.fsPath)) {
                        return;
                    }

                    const path = document.uri.fsPath;
                    const content = document.getText();
                    this.handle(path, [], {
                        content,
                        delay: 50,
                    });
                });
            },
            null,
            subscriptions
        );

        this.workspace.onWillSaveTextDocument(
            (event: TextDocumentWillSaveEvent) => {
                const document: TextDocument = event.document;
                if (<boolean>this.config.get('testOnSave') === false) {
                    return;
                }
                const path = document.uri.fsPath;
                const content = document.getText();
                this.handle(path, [], {
                    content,
                });
            },
            null,
            subscriptions
        );

        subscriptions.push(
            commands.registerCommand('phpunit.TestFile', () => {
                const document = this.document;
                const path = document.uri.fsPath;
                const content = document.getText();
                this.handle(path, [], {
                    content,
                });
            })
        );

        subscriptions.push(
            commands.registerCommand('phpunit.TestSuite', () => {
                this.handle('');
            })
        );

        this.disposable = Disposable.from(...subscriptions);

        return this;
    }

    handle(path: string, args: string[] = [], options?: any) {
        const content: string = options.content || '';

        this.statusBar.show();

        try {
            this.validator.validate(path, content);
        } catch (error) {
            console.warn(error);
            this.statusBar.hide();

            return Promise.reject(error);
        }

        this.statusBar.running('testing changes');

        this.clearDecoratedGutter();

        const params: Arguments = new Arguments(this.config.get('args', []).concat(args));

        const opts = {
            execPath: this.config.get('execPath', ''),
            basePath: this.container.basePath(this.editor, this.workspace),
        };

        return this.command
            .handle(path, params, opts)
            .then(items => {
                items.some(item => item.type !== Type.PASSED) ? this.statusBar.failed() : this.statusBar.success();

                this.store.put(items);
                this.decoratedGutter();
                this.handleDiagnostic();

                return Promise.resolve(items);
            })
            .catch(error => {
                this.decoratedGutter();
                this.handleDiagnostic();
                if (error === State.PHPUNIT_NOT_FOUND) {
                    this.window.showErrorMessage("'Couldn't find a vendor/bin/phpunit file'");
                }
                console.error(error);
                this.statusBar.failed(error);

                return Promise.resolve(error);
            });
    }

    dispose() {
        this.store.dispose();
        this.diagnosticManager.dispose();
        this.disposable.dispose();
    }

    private decoratedGutter() {
        this.decorateManager.decoratedGutter(this.store, [this.window.activeTextEditor]);
    }

    private clearDecoratedGutter() {
        this.decorateManager.clearDecoratedGutter([this.window.activeTextEditor]);
    }

    private handleDiagnostic() {
        this.diagnosticManager.handle(this.store, this.window.visibleTextEditors);
    }

    get editor(): TextEditor {
        return this.window.activeTextEditor;
    }

    get document(): TextDocument {
        return this.window.activeTextEditor.document;
    }

    get hasEditor(): boolean {
        return !!this.editor && !!this.document;
    }
}
