import { Command, PHPUnit, State, Validator } from './phpunit';
import { Disposable, TextDocument, TextEditor } from 'vscode';

import { DecorateManager } from './decorate-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { Store } from './store';

export class Project {
    constructor(public window: any, public workspace: any, public extensionPath: string) {}

    get rootPath() {
        return this.workspace.rootPath;
    }
}

export class Tester {
    private disposable: Disposable;
    private locked = false;
    private window: any;
    private workspace: any;
    private config: any;

    constructor(
        project: Project,
        private phpunit: PHPUnit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager,
        private store: Store = new Store(),
        private validator: Validator = new Validator()
    ) {
        this.window = project.window;
        this.workspace = project.workspace;
        this.config = this.workspace.getConfiguration('phpunit');
    }

    subscribe(): this {
        const subscriptions: Disposable[] = [];

        // this.workspace.onDidOpenTextDocument(this.restore.bind(this), null, subscriptions)
        this.workspace.onDidChangeConfiguration(
            () => (this.config = this.workspace.getConfiguration('phpunit')),
            null,
            subscriptions
        );
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

        const { execPath, args, junitPath } = this.config;

        this.phpunit
            .handle(new Command(fileName, args, execPath, this.workspace.rootPath, junitPath))
            .then(testCases => {
                this.store.put(testCases);
                this.decoratedGutter();
                this.handleDiagnostic();
            })
            .catch(error => {
                this.decoratedGutter();
                this.handleDiagnostic();
                console.error(error);
            });
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
