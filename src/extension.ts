import { ExtensionContext, TextDocument, window, workspace } from 'vscode'
import { Message, Parser } from './parser'

import { Decorator } from './decorator'
import { Filesystem } from './filesystem'
import { PHPUnit } from './phpunit'

export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!')

    const channel = window.createOutputChannel('phpunit')

    const decorator = new Decorator()
    const parser = new Parser()
    const filesystem = new Filesystem()
    const phpunit = new PHPUnit(parser, filesystem).setRootPath(workspace.rootPath).setOutput((buffer: Buffer) => {
        channel.append(noAnsi(buffer.toString()))
    })

    // const disposable = workspace.onWillSaveTextDocument(async (e: TextDocumentWillSaveEvent) => {
    //     const messages = await phpunit.run(e.document.fileName, output);
    //     console.log(messages);
    // });
    // context.subscriptions.push(disposable);

    const exec = async function(textDocument: TextDocument) {
        const messages: Message[] = await phpunit.handle(textDocument.fileName)
        decorator.update(window.activeTextEditor, messages)
    }

    const disposable2 = workspace.onDidOpenTextDocument((textDocument: TextDocument) => {
        setTimeout(() => {
            exec(textDocument)
        }, 2000)
    })
    context.subscriptions.push(disposable2)

    const disposable3 = workspace.onDidSaveTextDocument((textDocument: TextDocument) => {
        exec(textDocument)
    })
    context.subscriptions.push(disposable3)
}

// this method is called when your extension is deactivated
export function deactivate() {}

export function noAnsi(str: string): string {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}
