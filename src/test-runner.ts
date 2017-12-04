import { Disposable, TextDocument, TextDocumentWillSaveEvent, TextEditor } from 'vscode';
import { Runner, State, TestCase, Type } from 'phpunit-editor-support';

import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { Delayer } from './delayer';
import { DiagnosticManager } from './diagnostic-manager';
import { StatusBar } from './status-bar';
import { Store } from './store';
import { Validator } from './validator';
import { tap } from './helpers';

export interface TestRunnerOptions {
    container: Container;
    command: Runner;
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
    private command: Runner;
    private statusBar: StatusBar;
    private decorateManager: DecorateManager;
    private diagnosticManager: DiagnosticManager;

    private delayer = new Delayer<void>(1000);

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
                if (this.validator.isGitFile(editor.document.uri.fsPath) === true) {
                    return;
                }

                this.decoratedGutter();

                this.delayer.trigger(() => {
                    this.onOpen(editor.document);
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

    handle(path: string, thisArgs: string[] = []): Promise<TestCase[]> {
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
            this.command.run(path, this.config.get('args', []).concat(thisArgs), {
                execPath: this.config.get('execPath', ''),
                rootPath: this.container.basePath(this.window.activeTextEditor, this.workspace),
            }),
            (promise: Promise<TestCase[]>) => {
                promise.then(this.onCompleted.bind(this));
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
            .then(() => this.triggerRelationFile(document))
            .catch(() => this.triggerRelationFile(document));
    }

    private onCompleted(tests: TestCase[]): Promise<TestCase[]> {
        this.store.put(tests);

        this.decoratedGutter();
        this.handleDiagnostic();

        tests.some(item => item.type !== Type.PASSED) ? this.statusBar.failed() : this.statusBar.success();

        return Promise.resolve(tests);
    }

    private onError(error: string): Promise<any> {
        this.decoratedGutter();
        this.handleDiagnostic();

        this.statusBar.failed(error);

        if (error === State.PHPUNIT_NOT_FOUND) {
            this.window.showErrorMessage("'Couldn't find a vendor/bin/phpunit file'");
        }

        console.error(error);

        return Promise.reject(error);
    }

    private triggerRelationFile(document: TextDocument) {
        this.store.whereTestCase(document.uri.fsPath).forEach((test: TestCase) => this.handle(test.file));
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

    dispose() {
        this.store.dispose();
        this.diagnosticManager.dispose();
        this.disposable.dispose();
    }
}
