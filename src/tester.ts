import { Disposable, TextDocument, TextEditor } from 'vscode'

import { DecorateManager } from './decorate-manager'
import { DiagnosticManager } from './diagnostic-manager'
import { Phpunit } from './phpunit'
import { Project } from './project'
import { Store } from './store'

export class Tester {
    private disposable: Disposable

    constructor(
        private project: Project,
        private phpunit: Phpunit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager,
        private store: Store = new Store()
    ) {}

    subscribe(): this {
        const subscriptions: Disposable[] = []
        const { window, workspace } = this.project

        // workspace.onDidOpenTextDocument(this.restore.bind(this), null, subscriptions)
        workspace.onWillSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // workspace.onDidSaveTextDocument(this.restore.bind(this), null, subscriptions)
        // workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     const editor = this.getActiveTextEditor()
        //     if (editor && document === editor.document) {
        //         this.restore()
        //     }
        // }, null, subscriptions)
        // window.onDidChangeActiveTextEditor(this.restore.bind(this), null, subscriptions)
        window.onDidChangeActiveTextEditor(this.restore.bind(this), null, subscriptions)

        this.restore()

        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    async exec() {
        if (this.isExecutable() === false) {
            return
        }

        const messages = await this.phpunit.exec(this.document.fileName)
        this.store.put(messages)

        this.decoratedGutter()
        this.handleDiagnostic()
    }

    restore(): void {
        if (this.isExecutable() === false) {
            return
        }

        if (this.store.has(this.document.fileName)) {
            this.decoratedGutter()
            this.handleDiagnostic()

            return
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

    private handleDiagnostic() {
        this.diagnosticManager.handle(this.store, this.editor)
    }

    private isExecutable() {
        const keywords = new RegExp(
            [
                'PHPUnit\\\\Framework\\\\TestCase',
                'PHPUnit\\Framework\\TestCase',
                'PHPUnit_Framework_TestCase',
                'TestCase',
            ].join('|')
        )

        if (!this.editor || !this.document || keywords.test(this.document.getText()) === false) {
            return false
        }

        if (/\.git\.php$/.test(this.document.fileName) === true) {
            return false
        }

        return true
    }

    get editor(): TextEditor {
        return this.project.window.activeTextEditor
    }

    get document(): TextDocument {
        return this.editor.document
    }
}
