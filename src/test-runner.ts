import { Disposable, TextDocument, TextDocumentWillSaveEvent, TextEditor } from 'vscode';
import { PHPUnit, State } from './command/phpunit';
import { TestCase, Type } from './parsers/parser';

import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { DelayHandler } from './delay-handler';
import { DiagnosticManager } from './diagnostic-manager';
import { StatusBar } from './status-bar';
import { Store } from './store';
import { Validator } from './validator';
import { tap } from './helpers';

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

    private container: Container;
    private command: PHPUnit;
    private statusBar: StatusBar;
    private decorateManager: DecorateManager;
    private diagnosticManager: DiagnosticManager;

    private delayHandler = new DelayHandler();

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
                this.decoratedGutter();

                this.delayHandler.delay(1000).then(cancelled => {
                    if (cancelled === false && this.validator.isGitFile(editor.document.uri.fsPath) === false) {
                        this.onOpen(editor.document);
                    }
                });
            },
            null,
            subscriptions
        );

        this.workspace.onWillSaveTextDocument(
            (event: TextDocumentWillSaveEvent) => this.onSave(event.document),
            null,
            subscriptions
        );

        subscriptions.push(
            commands.registerCommand('phpunit.TestFile', () => {
                this.trigger(this.window.activeTextEditor.document);
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

    handle(path: string, args: string[] = []): Promise<TestCase[]> {
        if (this.validator.allowExtension(path) === false) {
            return Promise.reject(State.PHPUNIT_NOT_PHP);
        }

        if (this.validator.isTestCase(path) === false) {
            return Promise.reject(State.PHPUNIT_NOT_TESTCASE);
        }

        this.statusBar.show();
        this.statusBar.running('testing changes');

        this.clearDecoratedGutter();

        return tap(
            this.command.handle(path, this.config.get('args', []).concat(args), {
                execPath: this.config.get('execPath', ''),
                basePath: this.container.basePath(this.window.activeTextEditor, this.workspace),
            }),
            promise => {
                promise.then(this.onFinish.bind(this));
                promise.catch(this.onError.bind(this));
            }
        );
    }

    private trigger(document: TextDocument): Promise<TestCase[]> {
        const path = document.uri.fsPath;

        return this.handle(path, []);
    }

    private onOpen(document: TextDocument) {
        if (<boolean>this.config.get('testOnOpen') === true && this.store.has(document.uri.fsPath) === false) {
            this.trigger(document);
        }
    }

    private onSave(document: TextDocument) {
        if (<boolean>this.config.get('testOnSave') === false) {
            return;
        }

        this.trigger(document)
            .then(() => {
                this.triggerRelationFile(document);
            })
            .catch(() => {
                this.triggerRelationFile(document);
            });
    }

    private triggerRelationFile(document: TextDocument) {
        this.store.filterDetails(document.uri.fsPath).forEach(item => this.handle(item.file));
    }

    private onFinish(items: TestCase[]): Promise<TestCase[]> {
        this.store.put(items);

        this.decoratedGutter();
        this.handleDiagnostic();

        items.some(item => item.type !== Type.PASSED) ? this.statusBar.failed() : this.statusBar.success();

        return Promise.resolve(items);
    }

    private onError(error): Promise<any> {
        this.decoratedGutter();
        this.handleDiagnostic();

        this.statusBar.failed(error);

        if (error === State.PHPUNIT_NOT_FOUND) {
            this.window.showErrorMessage("'Couldn't find a vendor/bin/phpunit file'");
        }

        console.error(error);

        return Promise.reject(error);
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
}
