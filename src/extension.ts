import { Disposable, ExtensionContext, OutputChannel, TextDocument, TextEditor } from 'vscode'
import { Message, Parser } from './parser'
import { Window, Workspace } from './wrapper/vscode'

import { DecorateManager } from './decorate-manager'
import { Filesystem } from './filesystem'
import { PHPUnit } from './phpunit'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    new UnitTest(
        new DecorateManager(context)
    ).listen()

    // context.subscriptions.push(new UnitTest(
    //     new DecorateManager(context)
    // ).listen())

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
        private decorateManager: DecorateManager,
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
        let activeEditor = this.window.getActiveTextEditor();
        const subscriptions: Disposable[] = []

        this.window.onDidChangeActiveTextEditor((editor: TextEditor) => {
            activeEditor = editor;
            this.handle(activeEditor);
        }, null, subscriptions);

        this.workspace.onDidSaveTextDocument((document: TextDocument) => {
            if (document) {
                this.handle(activeEditor)
            }
        }, null, subscriptions)

        this.workspace.onDidChangeTextDocument((document: TextDocument) => {
            if (activeEditor && document === activeEditor.document) {
                this.handle(activeEditor)
            }
        }, null, subscriptions)

        this.disposable = Disposable.from(...subscriptions)

        if (activeEditor) {
            this.handle(activeEditor);
        }

        return this
    }

    public async handle(editor: TextEditor) {
        const messages: Message[] = await this.phpUnit.handle(editor.document.fileName)
        this.decorateManager.clearDecoratedGutter(editor).decorateGutter(editor, messages)
    }

    protected noAnsi(str: string): string {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    }

    public dispose() {
        this.disposable.dispose()
    }
}
