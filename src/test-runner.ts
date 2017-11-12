import { Disposable, TextDocument, TextEditor } from 'vscode';
import { PHPUnit, State } from './phpunit';

import { CommandOptions } from './command-options';
import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { Delay } from './delay';
import { DiagnosticManager } from './diagnostic-manager';
import { Store } from './store';
import { Validator } from './validator';

const delay = new Delay();

export class TestRunner {
    private disposable: Disposable;
    private window: any;
    private workspace: any;
    private store: Store;
    private validator: Validator;
    private config: ConfigRepository;

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

        this.window.onDidChangeActiveTextEditor(() => this.delayDocumentChanged(1000, false), null, subscriptions);
        // this.workspace.onDidOpenTextDocument(() => this.delayDocumentChanged(1000, false), null, subscriptions)
        this.workspace.onWillSaveTextDocument(() => this.delayDocumentChanged(50, true), null, subscriptions);
        // this.workspace.onDidSaveTextDocument(() => this.delayDocumentChanged(50, true), null, subscriptions)
        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (this.hasEditor && document === this.document) {
        //         this.delayDocumentChanged(50, true)
        //     }
        // }, null, subscriptions)

        subscriptions.push(
            commands.registerCommand('phpunit.TestFile', () => {
                this.delayDocumentChanged(0, true);
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

    handle(path: string, args: string[] = [], content: string = '', force = true) {
        this.clearDecoratedGutter();

        if (path && this.validator.fileName(path) === false) {
            console.warn(State.PHPUNIT_NOT_PHP, path);

            return false;
        }

        if (content && this.validator.className(path, content) === false) {
            console.warn(State.PHPUNIT_NOT_TESTCASE, path, content);

            return;
        }

        if (force === false && this.store.has(path) === true) {
            this.decoratedGutter();
            this.handleDiagnostic();

            return false;
        }

        const execPath: string = this.config.get('execPath', '');
        const options: CommandOptions = new CommandOptions(this.config.get('args', []).concat(args));

        this.phpunit
            .handle(path, options, execPath)
            .then(items => {
                this.store.put(items);
                this.decoratedGutter();
                this.handleDiagnostic();
            })
            .catch(error => {
                this.decoratedGutter();
                this.handleDiagnostic();
                if (error === State.PHPUNIT_NOT_FOUND) {
                    this.window.showErrorMessage("'Couldn't find a vendor/bin/phpunit file'");
                }
                console.error(error);
            });
    }

    private delayDocumentChanged(timeout = 50, force = false) {
        if (this.hasEditor === false) {
            return false;
        }

        const path: string = this.fileName;
        const content: string = this.document.getText();

        return delay.resolve(() => this.handle(path, [], content, force), timeout);
    }

    dispose() {
        this.store.dispose();
        this.diagnosticManager.dispose();
        this.disposable.dispose();
    }

    private decoratedGutter() {
        this.decorateManager.decoratedGutter(this.store, this.editor);
    }

    private clearDecoratedGutter() {
        this.decorateManager.clearDecoratedGutter(this.editor);
    }

    private handleDiagnostic() {
        this.diagnosticManager.handle(this.store, this.editor);
    }

    get editor(): TextEditor {
        return this.window.activeTextEditor;
    }

    get document(): TextDocument {
        return this.window.activeTextEditor.document;
    }

    get fileName(): string {
        return this.hasEditor ? this.document.fileName : '';
    }

    get hasEditor(): boolean {
        return !!this.editor && !!this.document;
    }
}
