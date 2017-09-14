import { DecorateManager, DecorationStyle } from './decorate-manager'
import { Disposable, ExtensionContext, OutputChannel, TextEditor } from 'vscode'
import { Message, Parser, State } from './parser'
import { Window, Workspace } from './wrapper/vscode'

import { DiagnosticManager } from './diagnostic-manager'
import { Filesystem } from './filesystem'
import { PHPUnit } from './phpunit'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    // const decorateManager = new DecorateManager(context)
    new UnitTest(new DecorateManager(new DecorationStyle(context.extensionPath)), new DiagnosticManager()).listen()
}

// this method is called when your extension is deactivated
export function deactivate() {}

class UnitTest {
    private disposable: Disposable
    public constructor(
        private decorateManager: DecorateManager,
        private diagnosticManager: DiagnosticManager,
        private window: Window = new Window(),
        private workspace: Workspace = new Workspace(),
        private phpUnit: PHPUnit = new PHPUnit(new Parser(), new Filesystem())
    ) {
        this.setupOutputChannel()
    }

    private setupOutputChannel() {
        const channel: OutputChannel = this.window.createOutputChannel('PHPUnit')
        this.phpUnit.setRootPath(this.workspace.rootPath).setOutput((buffer: Buffer) => {
            channel.append(this.noAnsi(buffer.toString()))
        })
    }

    public listen(): this {
        const subscriptions: Disposable[] = []

        this.workspace.onDidOpenTextDocument(
            () => {
                this.handle(this.window.getActiveTextEditor())
            },
            null,
            subscriptions
        )

        this.workspace.onWillSaveTextDocument(
            () => {
                this.handle(this.window.getActiveTextEditor())
            },
            null,
            subscriptions
        )

        // this.window.onDidChangeActiveTextEditor(() => {
        //     this.handle(this.window.getActiveTextEditor())
        // }, null, subscriptions);

        // this.workspace.onDidSaveTextDocument((document: TextDocument) => {
        //     if (document) {
        //         this.handle(this.window.getActiveTextEditor())
        //     }
        // }, null, subscriptions)

        // this.workspace.onDidChangeTextDocument((document: TextDocument) => {
        //     if (activeEditor && document === activeEditor.document) {
        //         this.handle(this.window.getActiveTextEditor())
        //     }
        // }, null, subscriptions)

        // if (this.window.getActiveTextEditor()) {
        //     this.handle(this.window.getActiveTextEditor());
        // }

        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    public async handle(editor: TextEditor) {
        const keywords = new RegExp(
            ['PHPUnit\\\\Framework\\\\TestCase', 'PHPUnit\\Framework\\TestCase', 'PHPUnit_Framework_TestCase'].join('|')
        )

        if (keywords.test(editor.document.getText()) === false) {
            return
        }

        const messages: Message[] = await this.phpUnit.handle(editor.document.fileName)
        const messageGroup = this.groupMessageByState(messages)

        this.decorateManager.decorateGutter(editor, messageGroup)
        this.diagnosticManager.diagnostic(editor, messageGroup)
    }

    protected noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }

    protected groupMessageByState(messages: Message[]): Map<State, Message[]> {
        return messages.reduce((messageGroup: Map<State, Message[]>, message: Message) => {
            return messageGroup.set(message.state, messageGroup.get(message.state).concat(message))
        }, new Map<State, Message[]>([[State.PASSED, []], [State.FAILED, []], [State.SKIPPED, []], [State.INCOMPLETED, []]]))
    }

    public dispose() {
        this.diagnosticManager.dispose()
        this.disposable.dispose()
    }
}
