import { Disposable, TextDocument, TextEditor } from 'vscode';
import { PHPUnit, State } from './phpunit';

import { CommandOptions } from './command-options';
import { ConfigRepository } from './config';
import { Container } from './container';
import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { Store } from './store';
import { Validator } from './validator';

export class Tester {
    private disposable: Disposable;
    private locked = false;
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

    subscribe(): this {
        const subscriptions: Disposable[] = [];

        // this.workspace.onDidOpenTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeConfiguration(
        //     () => (this.config = this.workspace.getConfiguration('phpunit')),
        //     null,
        //     subscriptions
        // );
        this.workspace.onWillSaveTextDocument(() => this.unlock().fire(), null, subscriptions);
        // this.workspace.onDidSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (this.hasEditor && document === this.document) {
        //         this.restore()
        //     }
        // }, null, subscriptions)
        this.window.onDidChangeActiveTextEditor(() => this.lock().fire(), null, subscriptions);
        this.lock().fire();
        this.disposable = Disposable.from(...subscriptions);

        return this;
    }

    handle(path: string, args: string[] = []) {
        const execPath: string = this.config.get('execPath');
        const options: CommandOptions = new CommandOptions(this.config.get('args').concat(args));

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
                    this.window.showWarningMessage("Couldn't find a phpunit file.");
                }
                console.error(error);
            });
    }

    fire() {
        if (this.hasEditor === false) {
            return false;
        }

        const path: string = this.fileName;

        this.clearDecoratedGutter();

        if (this.validator.fileName(path) === false) {
            console.warn(State.PHPUNIT_NOT_PHP, path);

            return false;
        }

        if (this.validator.className(path, this.document.getText()) === false) {
            console.warn(State.PHPUNIT_NOT_TESTCASE, path, this.document.getText());

            return;
        }

        if (this.isLocked() === true && this.store.has(path) === true) {
            this.decoratedGutter();
            this.handleDiagnostic();

            return false;
        }

        this.handle(this.fileName, []);
    }

    lock(): this {
        this.locked = true;

        return this;
    }

    unlock(): this {
        this.locked = false;

        return this;
    }

    isLocked(): boolean {
        return this.locked;
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
