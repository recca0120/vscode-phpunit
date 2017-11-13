import { Disposable, TextDocument, TextDocumentWillSaveEvent, TextEditor } from 'vscode';
import { PHPUnit, State } from './phpunit';

import { CommandArguments } from './command-arguments';
import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { DelayHandler } from './delay-handler';
import { DiagnosticManager } from './diagnostic-manager';
import { Store } from './store';
import { Validator } from './validator';
import { basename } from 'path';

export class TestRunner {
    private disposable: Disposable;
    private window: any;
    private workspace: any;
    private store: Store;
    private validator: Validator;
    private config: ConfigRepository;
    private delayHandler: DelayHandler = new DelayHandler();

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

        this.workspace.onDidOpenTextDocument(
            (document: TextDocument) => {
                if (!this.hasEditor) {
                    return;
                }

                const path = this.document.fileName;

                if (<boolean>this.config.get('testOnOpen') === false || this.store.has(path) === true) {
                    this.decoratedGutter();

                    return;
                }

                this.handle(path, [], {
                    content: document.getText(),
                    delay: 200,
                });
            },
            null,
            subscriptions
        );

        this.workspace.onWillSaveTextDocument(
            (event: TextDocumentWillSaveEvent) => {
                if (<boolean>this.config.get('testOnSave') === false) {
                    return;
                }

                event.waitUntil(
                    new Promise(resolve => {
                        const document = event.document;
                        const path = document.fileName;

                        this.handle(path, [], {
                            content: document.getText(),
                            delay: 50,
                        });

                        resolve();
                    })
                );
            },
            null,
            subscriptions
        );

        subscriptions.push(
            commands.registerCommand('phpunit.TestFile', () => {
                const document = this.document;
                const path = document.fileName;

                this.handle(path, [], {
                    content: document.getText(),
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
        return new Promise((resolve, reject) => {
            const content: string = options.content || '';
            const delay: number = options.delay || 0;

            this.delayHandler.resolve(delay).then((cancelled: boolean) => {
                if (cancelled === true) {
                    resolve();

                    return;
                }

                if (path && this.validator.fileName(path) === false) {
                    console.warn(State.PHPUNIT_NOT_PHP);
                    reject(State.PHPUNIT_NOT_PHP);

                    return false;
                }

                if (content && this.validator.className(path, content) === false) {
                    console.warn(State.PHPUNIT_NOT_TESTCASE);
                    reject(State.PHPUNIT_NOT_TESTCASE);

                    return;
                }

                this.clearDecoratedGutter();

                const commandArguments: CommandArguments = new CommandArguments(
                    this.config.get('args', []).concat(args)
                );

                const options = {
                    execPath: this.config.get('execPath', ''),
                    basePath: this.container.basePath(this.editor, this.workspace),
                };

                const handlePromise = this.phpunit.handle(path, commandArguments, options);

                handlePromise.then(items => {
                    this.store.put(items);
                    this.decoratedGutter();
                    this.handleDiagnostic();
                    resolve(items);
                });

                handlePromise.catch(error => {
                    this.decoratedGutter();
                    this.handleDiagnostic();
                    if (error === State.PHPUNIT_NOT_FOUND) {
                        this.window.showErrorMessage("'Couldn't find a vendor/bin/phpunit file'");
                    }
                    console.error(error);
                    reject(error);
                });
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
