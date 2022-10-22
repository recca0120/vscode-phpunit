import * as chai from 'chai';
import * as sinon from 'sinon';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', async () => {
		const showInformationMessage = sinon.spy(vscode.window, 'showInformationMessage');
		const ext = vscode.extensions.getExtension("recca0120.vscode-phpunit")!;
		await ext.activate();

		vscode.commands.executeCommand("vscode-phpunit.helloWorld");

		chai.expect(showInformationMessage.calledWith('Hello World from vscode-phpunit!')).to.be.true;
	});
});
