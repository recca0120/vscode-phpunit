import { DecorateManager, DecorationStyle } from './decorate-manager'
import { Disposable, ExtensionContext, OutputChannel, TextDocument, TextEditor } from 'vscode'
import { Languages, Window, Workspace } from './wrapper/vscode'
import { Message, Parser } from './parser'

import { DiagnosticManager } from './diagnostic-manager'
import { Filesystem } from './filesystem'
import { PHPUnit } from './phpunit'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    const decorateManager = new DecorateManager(new DecorationStyle(context.extensionPath))
    context.subscriptions.push(new UnitTest(decorateManager).register())
}

// this method is called when your extension is deactivated
export function deactivate() {}

class UnitTest {
    private disposable: Disposable

    public constructor(
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager = new DiagnosticManager(new Languages()),
        private phpUnit: PHPUnit = new PHPUnit(new Parser(), new Filesystem()),
        private workspace: Workspace = new Workspace(),
        private window: Window = new Window()
    ) {
        this.setupOutputChannel()
    }

    private setupOutputChannel() {
        const channel: OutputChannel = this.window.createOutputChannel('PHPUnit')
        this.phpUnit.setRootPath(this.workspace.rootPath).setOutput((buffer: Buffer) => {
            channel.append(this.noAnsi(buffer.toString()))
        })
    }

    public register(): this {
        const subscriptions: Disposable[] = []

        // this.workspace.onDidOpenTextDocument(this.trigger(false), null, subscriptions)
        this.workspace.onWillSaveTextDocument(this.trigger(false), null, subscriptions)
        // this.workspace.onDidSaveTextDocument(this.trigger(false), null, subscriptions)
        // this.workspace.onDidChangeTextDocument(this.trigger(true), null, subscriptions)
        // this.window.onDidChangeActiveTextEditor(this.trigger(false), null, subscriptions)

        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    public async handle(editor: TextEditor = null) {
        const keywords = new RegExp(
            [
                'PHPUnit\\\\Framework\\\\TestCase',
                'PHPUnit\\Framework\\TestCase',
                'PHPUnit_Framework_TestCase',
                'TestCase',
            ].join('|')
        )

        if (!editor || !editor.document || keywords.test(editor.document.getText()) === false) {
            return
        }

        const messages: Message[] = await this.phpUnit.handle(editor.document.fileName)
        this.decorateManager.handle(messages, editor)
        this.diagnosticManager.handle(messages, editor)
    }

    protected trigger(checkDocument: boolean = false) {
        if (checkDocument === true) {
            return (document: TextDocument) => {
                const editor = this.window.getActiveTextEditor()
                if (editor && document === editor.document) {
                    this.handle(editor)
                }
            }
        }

        return () => {
            this.handle(this.window.getActiveTextEditor())
        }
    }

    protected noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }

    public dispose() {
        this.diagnosticManager.dispose()
        this.disposable.dispose()
    }
}
