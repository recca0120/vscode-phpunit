import { window, DecorationRenderOptions, TextEditorDecorationType, TextEditor } from 'vscode';

export class Window {
    get activeTextEditor(): TextEditor | undefined {
        return window.activeTextEditor;
    }

    createTextEditorDecorationType(options: DecorationRenderOptions): TextEditorDecorationType {
        return window.createTextEditorDecorationType(options);
    }
}
