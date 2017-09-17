import {
    DiagnosticCollection,
    Disposable,
    ExtensionContext,
    OutputChannel,
    TextDocument,
    TextEditor,
    languages,
    window,
    workspace,
} from 'vscode'

import { DecorateManager } from './decorate-manager'
import { DiagnosticManager } from './diagnostic-manager'
import { Phpunit } from './phpunit'
import { Project } from './project'
import { Store } from './store'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    const project: Project = {
        window: window,
        workspace: workspace,
        rootPath: workspace.rootPath,
        extensionPath: context.extensionPath,
    }

    const name = 'phpunit'

    const outputChannel: OutputChannel = window.createOutputChannel(name)
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(name)

    const phpunit: Phpunit = new Phpunit(project).setOutput((buffer: Buffer) => {
        outputChannel.append(phpunit.noAnsi(buffer.toString()))
    })

    const decorateManager = new DecorateManager(project)
    const diagnosticManager = new DiagnosticManager(diagnostics)

    const tester = new Tester(project, phpunit, decorateManager, diagnosticManager)

    context.subscriptions.push(tester.subscribe())
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class Tester {
    private disposable: Disposable

    private store: Store = new Store()

    public constructor(
        private project: Project,
        private phpunit: Phpunit,
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager
    ) {}

    public subscribe(): this {
        const subscriptions: Disposable[] = []
        const { window, workspace } = this.project

        // workspace.onDidOpenTextDocument(this.trigger(false), null, subscriptions)
        workspace.onWillSaveTextDocument(this.trigger(false), null, subscriptions)
        // workspace.onDidSaveTextDocument(this.trigger(false), null, subscriptions)
        // workspace.onDidChangeTextDocument(this.trigger(true), null, subscriptions)
        // window.onDidChangeActiveTextEditor(this.trigger(false), null, subscriptions)
        window.onDidChangeActiveTextEditor(() => this.restore(this.getActiveTextEditor()), null, subscriptions)

        this.restore(this.getActiveTextEditor())

        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    public async exec(editor: TextEditor) {
        if (this.isExecutable(editor) === false) {
            return
        }

        await this.getMessage(editor)

        this.decoratedGutter(editor)
        this.handleDiagnostic(editor)
    }

    public restore(editor: TextEditor): void {
        if (this.isExecutable(editor) === false) {
            return
        }

        if (this.store.has(editor.document.fileName)) {
            this.decoratedGutter(editor)
            this.handleDiagnostic(editor)

            return
        }

        this.exec(editor)
    }

    public dispose() {
        this.store.dispose()
        this.diagnosticManager.dispose()
        this.disposable.dispose()
    }

    protected async getMessage(editor: TextEditor) {
        const messages = await this.phpunit.exec(editor.document.fileName)
        this.store.put(messages)
    }

    protected decoratedGutter(editor: TextEditor) {
        this.decorateManager.decoratedGutter(this.store, editor)
    }

    protected handleDiagnostic(editor: TextEditor) {
        this.diagnosticManager.handle(this.store, editor)
    }

    protected trigger(checkDocument: boolean = false) {
        if (checkDocument === true) {
            return (document: TextDocument) => {
                const editor = this.getActiveTextEditor()
                if (editor && document === editor.document) {
                    this.exec(editor)
                }
            }
        }

        return () => {
            this.exec(this.getActiveTextEditor())
        }
    }

    protected isExecutable(editor: TextEditor) {
        const keywords = new RegExp(
            [
                'PHPUnit\\\\Framework\\\\TestCase',
                'PHPUnit\\Framework\\TestCase',
                'PHPUnit_Framework_TestCase',
                'TestCase',
            ].join('|')
        )

        if (!editor || !editor.document || keywords.test(editor.document.getText()) === false) {
            return false
        }

        if (/\.git\.php$/.test(editor.document.fileName) === true) {
            return false
        }

        return true
    }

    protected getActiveTextEditor(): TextEditor {
        return this.project.window.activeTextEditor
    }
}
