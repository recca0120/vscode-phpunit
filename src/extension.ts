'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, workspace, TextDocument, window } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!');

    const output = window.createOutputChannel("phpunit");
    const phpunit = new PHPUnit;

    const disposable = workspace.onDidSaveTextDocument((textDocument: TextDocument) => {
        phpunit.run(textDocument.fileName, output);
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

export class PHPUnit {
    public run(fileName: string, output: any = null) {
        const command = 'C:\\ProgramData\\ComposerSetup\\vendor\\bin\\phpunit.bat';
        const args = [
            fileName,
            '--log-junit',
            path.join(__dirname, 'junit.xml')
        ];
        const proc = cp.spawn(command, args, {cwd: workspace.rootPath});
        const cb = (buffer: Buffer) => {
            if (output === null) {
                return;
            }
            output.append(buffer.toString()); 
        }
        
        proc.stderr.on('data', cb);
        proc.stdout.on('data', cb);
    }
}