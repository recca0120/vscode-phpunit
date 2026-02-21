import { phpUnitProject } from '@vscode-phpunit/phpunit';
import { describe, expect, it } from 'vitest';
import { Uri } from 'vscode';
import { URI } from 'vscode-uri';

describe('Uri test', () => {
    const path = 'C:\\phpunit-stub\\tests\\AssertionsTest.php';
    const uri = Uri.file(path);

    it('schema', () => {
        expect(uri.scheme).toEqual('file');
    });

    it('path', () => {
        expect(uri.path).toEqual('/C:/phpunit-stub/tests/AssertionsTest.php');
    });

    it('fsPath', () => {
        expect(uri.fsPath).toEqual('c:\\phpunit-stub\\tests\\AssertionsTest.php');
    });

    it('toString()', () => {
        expect(uri.toString()).toEqual('file:///c%3A/phpunit-stub/tests/AssertionsTest.php');
    });

    it('equal to URI fsPath', () => {
        expect(URI.file(phpUnitProject('')).fsPath).toEqual(Uri.file(phpUnitProject('')).fsPath);
    });
});
