import { TestSuiteCollection } from './TestSuiteCollection';
import { TestRunner, TestRunnerParams } from './TestRunner';
import {
    TextDocuments,
    ExecuteCommandParams,
    Connection,
    TextDocument,
    Position,
    LogMessageNotification,
    MessageType,
    WillSaveTextDocumentWaitUntilRequest,
    TextDocumentSaveReason,
} from 'vscode-languageserver';

export class Controller {
    public commands = [
        'phpunit.lsp.load',
        'phpunit.lsp.run-all',
        'phpunit.lsp.rerun',
        'phpunit.lsp.run-directory',
        'phpunit.lsp.run-file',
        'phpunit.lsp.run-test-at-cursor',
        'phpunit.lsp.cancel',
    ];

    constructor(
        private connection: Connection,
        private documents: TextDocuments,
        private suites: TestSuiteCollection,
        private testRunner: TestRunner
    ) {}

    async executeCommand(params: ExecuteCommandParams) {
        return this.runTest(params);
    }

    private async runTest(params: ExecuteCommandParams) {
        try {
            this.connection.sendNotification('started');

            const response = await this.doRunTest(params);

            this.connection.sendNotification(LogMessageNotification.type, {
                type: MessageType.Log,
                message: response,
            });

            return response;
        } catch (e) {
            throw e;
        } finally {
            this.connection.sendNotification('finished');
        }
    }

    private async doRunTest(
        _params: ExecuteCommandParams
    ): Promise<string | void> {
        const command = _params.command;
        const params = this.asTestRunnerParams(_params.arguments);

        if (command === 'phpunit.lsp.run-all') {
            return await this.testRunner.runAll();
        }

        if (command === 'phpunit.lsp.run-file') {
            return await this.testRunner.runFile(params);
        }

        if (command === 'phpunit.lsp.run-directory') {
            return await this.testRunner.runDirectory(params);
        }

        if (command === 'phpunit.lsp.rerun') {
            return await this.testRunner.rerun(params);
        }

        if (command === 'phpunit.lsp.run-test-at-cursor') {
            return await this.testRunner.runTestAtCursor(params);
        }
    }

    private asTestRunnerParams(args: any[]): TestRunnerParams {
        const params: TestRunnerParams = {};

        if (args[0]) {
            params.textDocument = this.documents.get(args[0]) as TextDocument;

            this.connection.sendRequest(
                WillSaveTextDocumentWaitUntilRequest.type,
                {
                    textDocument: params.textDocument,
                    reason: TextDocumentSaveReason.Manual,
                }
            );
        }

        if (args[1]) {
            params.position = args[1] as Position;
            params.suites = this.suites;
        }

        return params;
    }
}
