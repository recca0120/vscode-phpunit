import { Disposable, TextDocument, TextEditor } from 'vscode';
import { PHPUnit, State } from './phpunit';

import { CommandOptions } from './command-options';
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
    private config: any;

    constructor(
        private container: Container,
        private phpunit: PHPUnit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager,
        private store: Store = null,
        private validator: Validator = null
    ) {
        this.window = this.container.window;
        this.workspace = this.container.workspace;
        this.store = this.store || this.container.store;
        this.validator = this.validator || this.container.validator;
        this.config = this.workspace.getConfiguration('phpunit');
    }

    subscribe(): this {
        const subscriptions: Disposable[] = [];

        // this.workspace.onDidOpenTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeConfiguration(
        //     () => (this.config = this.workspace.getConfiguration('phpunit')),
        //     null,
        //     subscriptions
        // );
        this.workspace.onWillSaveTextDocument(() => this.unlock().handle(), null, subscriptions);
        // this.workspace.onDidSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (this.hasEditor && document === this.document) {
        //         this.restore()
        //     }
        // }, null, subscriptions)
        this.window.onDidChangeActiveTextEditor(() => this.lock().handle(), null, subscriptions);
        this.lock().handle();
        this.disposable = Disposable.from(...subscriptions);

        return this;
    }

    handle() {
        if (this.hasEditor === false) {
            return;
        }

        const fileName = this.document.fileName;

        if (this.validator.fileName(fileName) === false) {
            console.warn(State.PHPUNIT_NOT_PHP);

            return;
        }

        if (this.validator.className(fileName, this.document.getText()) === false) {
            console.warn(State.PHPUNIT_NOT_TESTCASE);

            return;
        }

        this.clearDecoratedGutter();

        if (this.isLocked() === true && this.store.has(fileName) === true) {
            this.decoratedGutter();
            this.handleDiagnostic();

            return;
        }

        const { execPath, args } = this.config;

        this.phpunit
            .handle(fileName, new CommandOptions(args), execPath)
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

    get hasEditor(): boolean {
        return !!this.editor && !!this.document;
    }
}
