import { Disposable, ExtensionContext, OutputChannel, TextDocument } from 'vscode'
import { Message, Parser } from './parser'
import { Window, Workspace } from './wrapper/vscode'

import { DecorateManager } from './decorate-manager'
import { Filesystem } from './filesystem'
import { PHPUnit } from './phpunit'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    context.subscriptions.push(new UnitTest().listen())

    // const disposable = workspace.onWillSaveTextDocument(async (e: TextDocumentWillSaveEvent) => {
    //     const messages = await phpunit.run(e.document.fileName, output);
    //     console.log(messages);
    // });
    //
}

// this method is called when your extension is deactivated
export function deactivate() {}

class UnitTest {
    private channel: OutputChannel
    private disposable: Disposable
    public constructor(
        private decorateManager: DecorateManager = new DecorateManager(),
        private window: Window = new Window(),
        private workspace: Workspace = new Workspace(),
        private phpUnit: PHPUnit = new PHPUnit(new Parser(), new Filesystem()),
    ) {
        this.channel = this.window.createOutputChannel('PHPUnit')
        this.phpUnit.setRootPath(this.workspace.rootPath).setOutput((buffer: Buffer) => {
            this.channel.append(this.noAnsi(buffer.toString()))
        })
    }

    public listen(): this {
        const subscriptions: Disposable[] = []
        this.workspace.onDidOpenTextDocument(
            (textDocument: TextDocument) => {
                setTimeout(() => {
                    this.handle(textDocument)
                }, 2000)
            },
            null,
            subscriptions
        )
        this.workspace.onDidSaveTextDocument(
            (textDocument: TextDocument) => {
                this.handle(textDocument)
            },
            null,
            subscriptions
        )
        this.disposable = Disposable.from(...subscriptions)

        return this
    }

    protected async handle(doc: TextDocument) {
        const editor = this.window.activeTextEditor
        const messages: Message[] = await this.phpUnit.handle(doc.fileName)
        this.decorateManager.clearDecoratedGutter(editor).decorateGutter(editor, messages)
    }

    protected noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }

    public dispose() {
        this.disposable.dispose()
    }
}
