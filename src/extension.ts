'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, workspace, TextDocument, window, TextDocumentWillSaveEvent } from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import {PHPUnit} from './phpunit';
import { tmpdir } from 'os';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-phpunit" is now active!');

    const output = window.createOutputChannel("phpunit");
    const phpunit = new PHPUnit({
        rootPath: workspace.rootPath,
        tmpdir: tmpdir()
    });
    
    const disposable = workspace.onDidOpenTextDocument(async (textDocument: TextDocument) => {
        const messages = await phpunit.run(textDocument.fileName, output);
        console.log(messages);
    });

    const disposable1 = workspace.onDidSaveTextDocument(async (textDocument: TextDocument) => {
        const messages = await phpunit.run(textDocument.fileName, output);
        console.log(messages);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable1);
}

// this method is called when your extension is deactivated
export function deactivate() {
}



