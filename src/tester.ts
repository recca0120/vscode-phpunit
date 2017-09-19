import { Disposable, TextDocument, TextEditor } from 'vscode'
import { Phpunit, State } from './phpunit'

import { DecorateManager } from './decorate-manager'
import { DiagnosticManager } from './diagnostic-manager'
import { Store } from './store'

export interface Project {
    window?: any
    workspace?: any
    rootPath?: string
    extensionPath?: string
}

export class Tester {
    private disposable: Disposable
    private window: any
    private workspace: any

    constructor(
        project: Project,
        private phpunit: Phpunit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager,
        private store: Store = new Store()
    ) {
        this.window = project.window
        this.workspace = project.workspace
    }

    subscribe(): this {
        const subscriptions: Disposable[] = []

        // this.workspace.onDidOpenTextDocument(this.restore.bind(this), null, subscriptions)
        this.workspace.onWillSaveTextDocument(this.exec.bind(this), null, subscriptions)
        // this.workspace.onDidSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (this.hasEditor && document === this.document) {
        //         this.restore()
        //     }
        // }, null, subscriptions)
        this.window.onDidChangeActiveTextEditor(this.exec.bind(this), null, subscriptions)

        this.exec()

        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    async exec() {
        this.clearDecoratedGutter()

        try {
            if (!this.hasEditor) {
                return
            }

            const fileName = this.document.fileName
            const messages = await this.phpunit.exec(fileName, this.document.getText())
            this.store.put(messages)

            this.decoratedGutter()
            this.handleDiagnostic()
        } catch (e) {
            switch (e) {
                case State.PHPUNIT_NOT_FOUND:
                    this.window.showErrorMessage('[phpunit] composer require phpunit/phpunit')
                    console.error(this.phpunit.getLastOutput())
                    break
                case State.PHPUNIT_EXECUTE_ERROR:
                    // this.window.showErrorMessage('[phpunit] something wrong')
                    console.error(this.phpunit.getLastOutput())
                    break
                case State.NOT_RUNNABLE:
                    console.log(e)
                    break
                default:
                    console.log(e)
                    break
            }
        }
    }

    restore(): void {
        if (!this.hasEditor) {
            return
        }

        if (this.store.has(this.document.fileName)) {
            this.decoratedGutter()
            this.handleDiagnostic()
        }

        this.exec()
    }

    dispose() {
        this.store.dispose()
        this.diagnosticManager.dispose()
        this.disposable.dispose()
    }

    private decoratedGutter() {
        this.decorateManager.decoratedGutter(this.store, this.editor)
    }

    private clearDecoratedGutter() {
        this.decorateManager.clearDecoratedGutter(this.editor)
    }

    private handleDiagnostic() {
        this.diagnosticManager.handle(this.store, this.editor)
    }

    get editor(): TextEditor {
        return this.window.activeTextEditor
    }

    get document(): TextDocument {
        return this.window.activeTextEditor.document
    }

    get hasEditor(): boolean {
        return !!this.editor && !!this.document
    }
}
