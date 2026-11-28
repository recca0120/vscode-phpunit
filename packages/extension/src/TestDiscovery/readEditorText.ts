import { type ReadText, readTextFile } from '@vscode-phpunit/phpunit';
import { workspace } from 'vscode';

export const readEditorText: ReadText = async (file) => {
    const document = workspace.textDocuments.find(
        (opened) => opened.isDirty && opened.uri.scheme === 'file' && opened.uri.fsPath === file,
    );

    return document ? document.getText() : readTextFile(file);
};
