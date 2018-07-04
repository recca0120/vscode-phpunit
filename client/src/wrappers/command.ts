import { commands, TextEditorEdit, TextEditor, Disposable } from 'vscode';

export class Command {
    registerTextEditorCommand(
        command: string,
        callback: (textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) => void,
        thisArg?: any
    ): Disposable {
        return commands.registerTextEditorCommand(command, callback, thisArg);
    }
}
