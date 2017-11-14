import { Disposable, TextDocument, TextDocumentWillSaveEvent, TextEditor } from 'vscode';
import { PHPUnit, State } from './command/phpunit';

import { Arguments } from './command/arguments';
import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { DelayHandler } from './delay-handler';
import { DiagnosticManager } from './diagnostic-manager';
import { Store } from './store';
import { Validator } from './validator';

export class TestRunner {
    private disposable: Disposable;
    private window: any;
    private workspace: any;
    private store: Store;
    private validator: Validator;
    private config: ConfigRepository;
    private phpUnitDelayed: DelayHandler = new DelayHandler('PHPUnit Cancelled');
    private decorateDelayed: DelayHandler = new DelayHandler('Decorate Calncelled');

    constructor(
        private container: Container,
        private phpunit: PHPUnit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager
    ) {
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

                if (this.validator.isGitFile(document.uri.fsPath) === true) {
                    return;
                }

                this.decorateDelayed.delay(100).then(() => {
                    this.decoratedGutter();
                });

                if (<boolean>this.config.get('testOnOpen') === false || this.store.has(document.uri.fsPath)) {
                    return;
                }

                const path = document.uri.fsPath;
                const content = document.getText();
                this.handle(path, [], {
                    content,
                    delay: 50,
                });
            },
            null,
            subscriptions
        );

        this.workspace.onWillSaveTextDocument(
            (event: TextDocumentWillSaveEvent) => () => {
                const document: TextDocument = event.document;
                if (<boolean>this.config.get('testOnSave') === false) {
                    return;
                }

                const path = document.uri.fsPath;
                const content = document.getText();

                this.handle(path, [], {
                    content,
                    delay: 50,
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
                    delay: 0,
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
        const delay: number = options.delay || 0;

        const opts = {
            execPath: this.config.get('execPath', ''),
            basePath: this.container.basePath(this.editor, this.workspace),
        };

        return this.phpUnitDelayed.delay(delay).then(() => {
            try {
                this.validator.validate(path, content);
            } catch (error) {
                console.warn(error);

                return Promise.reject(error);
            }

            this.clearDecoratedGutter();

            const params: Arguments = new Arguments(this.config.get('args', []).concat(args));

            return this.phpunit
                .handle(path, params, opts)
                .then(items => {
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
                });
        });
    }

    dispose() {
        this.store.dispose();
        this.diagnosticManager.dispose();
        this.disposable.dispose();
    }

    private decoratedGutter() {
        this.decorateManager.decoratedGutter(this.store, this.window.visibleTextEditors);
    }

    private clearDecoratedGutter() {
        this.decorateManager.clearDecoratedGutter(this.window.visibleTextEditors);
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
