import { describe, expect, it } from 'vitest';
import { Uri } from 'vscode';
import { createTextDocument } from './textDocument';

describe('createTextDocument', () => {
    const uri = Uri.file('/project/output.txt');
    const document = createTextDocument('first line\nsecond', uri);

    it('exposes the uri, file name and text', () => {
        expect(document.uri).toBe(uri);
        expect(document.fileName).toBe(uri.fsPath);
        expect(document.getText()).toBe('first line\nsecond');
    });

    it('splits the text into lines whose range ends at the line length', () => {
        expect(document.lineCount).toBe(2);
        expect(document.lineAt(1).text).toBe('second');
        expect(document.lineAt(0).range.start).toMatchObject({ line: 0, character: 0 });
        expect(document.lineAt(0).range.end).toMatchObject({ line: 0, character: 10 });
    });
});
