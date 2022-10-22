// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Sample test', async () => {
        const ext = vscode.extensions.getExtension('recca0120.vscode-phpunit')!;
        await ext.activate();
    });
});
