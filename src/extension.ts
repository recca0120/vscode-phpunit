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
    const ouputChannel = window.createOutputChannel("phpunit");

    const disposable = workspace.onDidSaveTextDocument((textDocument: TextDocument) => {
        const command = 'C:\\ProgramData\\ComposerSetup\\vendor\\bin\\phpunit.bat';
        const fileName = textDocument.fileName ;
        const args = [
            fileName,
            '--log-junit',
            path.join(__dirname, 'junit.xml')
        ];
        const proc = cp.spawn(command, args, {cwd: workspace.rootPath});
        const stderr = (buffer: Buffer) => { ouputChannel.append(buffer.toString()); };
        const stdout = (buffer: Buffer) => { ouputChannel.append(buffer.toString()); };
        proc.stderr.on('data', stderr);
        proc.stdout.on('data', stdout);
    });
  
    // // The command has been defined in the package.json file
    // // Now provide the implementation of the command with  registerCommand
    // // The commandId parameter must match the command field in package.json
    // let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
    //     // The code you place here will be executed every time your command is executed

    //     // Display a message box to the user
    //     vscode.window.showInformationMessage('Hello World!');
    // });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

