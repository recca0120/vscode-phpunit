import { Disposable, TextDocument, TextEditor } from 'vscode'
import { PHPUnit, State } from './phpunit'

import { DecorateManager } from './decorate-manager'
import { DiagnosticManager } from './diagnostic-manager'
import { Store } from './store'
import { TestCase } from './parser'

export interface Project {
    window?: any
    workspace?: any
    rootPath?: string
    extensionPath?: string
}

export class Tester {
    private disposable: Disposable
    private locked = false
    private window: any
    private workspace: any

    constructor(
        project: Project,
        private phpunit: PHPUnit,
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
        this.workspace.onWillSaveTextDocument(() => this.unlock().run(), null, subscriptions)
        // this.workspace.onDidSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (this.hasEditor && document === this.document) {
        //         this.restore()
        //     }
        // }, null, subscriptions)
        this.window.onDidChangeActiveTextEditor(() => this.lock().run(), null, subscriptions)
        this.lock().run()
        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    lock(): this {
        this.locked = true

        return this
    }

    unlock(): this {
        this.locked = false

        return this
    }

    isLocked(): boolean {
        return this.locked
    }

    async run() {
        try {
            this.clearDecoratedGutter()
            const fileName = this.document.fileName

            if (this.isLocked() === true && this.store.has(fileName) === true) {
                this.decoratedGutter()
                this.handleDiagnostic()

                return
            }

            const testCases: TestCase[] = await this.phpunit.run(fileName, this.document.getText())
            this.store.put(testCases)

            this.decoratedGutter()
            this.handleDiagnostic()
        } catch (e) {
            switch (e) {
                case State.PHPUNIT_NOT_FOUND:
                case State.PHPUNIT_EXECUTE_ERROR:
                default:
                    console.error(e)
                    break
                case State.PHPUNIT_NOT_TESTCASE:
                case State.PHPUNIT_NOT_PHP:
                    console.warn(e)
                    break
            }
        }
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
