import { commands, TextEditorEdit, TextEditor, Disposable } from 'vscode';

export class Commands {
    registerTextEditorCommand(
        command: string,
        callback: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => void,
        thisArg?: any
    ): Disposable {
        return commands.registerTextEditorCommand(command, callback, thisArg);
    }

    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
        return commands.registerCommand(command, callback, thisArg);
    }
}
