import { Position, Range, type TextDocument, Uri } from 'vscode';

export const createTextDocument = (text: string, uri = Uri.file('/untitled.txt')): TextDocument => {
    const lines = text.split('\n');

    return {
        uri,
        fileName: uri.fsPath,
        lineCount: lines.length,
        getText: () => text,
        lineAt: (line: number) => ({
            text: lines[line],
            range: new Range(new Position(line, 0), new Position(line, lines[line].length)),
        }),
    } as unknown as TextDocument;
};
