import { describe, expect, it } from '@jest/globals';
import { Uri } from 'vscode';

describe('Uri test', () => {
    const path = 'C:\\project-stub\\tests\\AssertionsTest.php';
    const uri = Uri.file(path);

    it('schema', () => {
        expect(uri.scheme).toEqual('file');
    });

    it('path', () => {
        expect(uri.path).toEqual('/C:/project-stub/tests/AssertionsTest.php');
    });

    it('fsPath', () => {
        expect(uri.fsPath).toEqual('c:\\project-stub\\tests\\AssertionsTest.php');
    });

    it('toString()', () => {
        expect(uri.toString()).toEqual('file:///c%3A/project-stub/tests/AssertionsTest.php');
    });
});
