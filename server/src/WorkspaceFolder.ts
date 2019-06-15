import files from './Filesystem';
import md5 from 'md5';
import { Configuration } from './Configuration';
import { ProblemMatcher } from './ProblemMatcher';
import { TestEvent, TestSuiteEvent, TestSuiteInfo } from './TestExplorer';
import { TestEventCollection } from './TestEventCollection';
import { TestNode, TestSuiteNode } from './Parser';
import { TestRunner } from './TestRunner';
import { TestSuiteCollection } from './TestSuiteCollection';
import {
    Connection,
    ExecuteCommandParams,
    LogMessageNotification,
    MessageType,
    FileEvent,
    FileChangeType,
} from 'vscode-languageserver';
import {
    TestResponse,
    ITestResponse,
    FailedTestResponse,
} from './TestResponse';

export class WorkspaceFolder {
    private commandLookup: Map<string, Function> = new Map([
        ['phpunit.lsp.run-all', this.runAll],
        ['phpunit.lsp.rerun', this.rerun],
        ['phpunit.lsp.run-file', this.runFile],
        ['phpunit.lsp.run-test-at-cursor', this.runTestAtCursor],
    ]);

    constructor(
        private workspaceFolder: string,
        private connection: Connection,
        private config: Configuration,
        private suites: TestSuiteCollection,
        private events: TestEventCollection,
        private testRunner: TestRunner,
        private problemMatcher: ProblemMatcher,
        private _files = files
    ) {
        this.onTestLoadStartedEvent();
        this.onTestRunStartedEvent();
        this.onTestCancelEvent();
    }

    getConfig() {
        return this.config;
    }

    async detectChange(event: FileEvent) {
        if (this.isFileChanged(event)) {
            await this.suites.put(event.uri);
        }

        return this.suites.get(event.uri);
    }

    async loadTest() {
        await this.connection.sendRequest(
            this.requestName('TestLoadStartedEvent')
        );

        this.suites.clear();
        this.events.clear();

        await this.sendLoadTestFinishedEvent(
            (await this.suites.load(this.config.files, {
                ignore: '**/vendor/**',
                cwd: this._files.asUri(this.workspaceFolder).fsPath,
            })).tree()
        );
    }

    async executeCommand(params: ExecuteCommandParams) {
        const command = params.command;
        const args = params.arguments || [];

        return this.commandLookup.has(command)
            ? await this.commandLookup.get(command)!.call(this, args)
            : await this.cancel();
    }

    async cancel() {
        this.testRunner.cancel();

        return this.sendRunTestFinished(new FailedTestResponse('cancel'));
    }

    private async runAll() {
        return await this.run({}, this.suites.all());
    }

    private async runFile(params: string[]) {
        const idOrFile: string = params[0] || '';
        const tests = this.suites.where(
            test => test.id === idOrFile || test.file === idOrFile
        );

        return await this.run({ file: tests[0].file }, tests);
    }

    private async runTestAtCursor(params: string[]) {
        const tests = this.findTestAtCursorOrId(params);

        return await this.run(tests[0], tests);
    }

    private async rerun(params: string[]) {
        const tests = this.findTestAtCursorOrId(params);

        return await this.run(tests[0], tests, true);
    }

    private async run(
        params: any,
        tests: (TestSuiteNode | TestNode)[],
        rerun = false
    ) {
        await this.sendTestRunStartedEvent(tests);

        this.testRunner
            .setPhpBinary(this.config.php)
            .setPhpUnitBinary(this.config.phpunit)
            .setArgs(this.config.args);

        const options = {
            cwd: this._files.asUri(this.workspaceFolder).fsPath,
        };

        const response =
            rerun === false
                ? await this.testRunner.run(params, options)
                : await this.testRunner.rerun(params, options);

        return this.sendRunTestFinished(
            new TestResponse(response, this.problemMatcher)
        );
    }

    private findTestAtCursorOrId(params: string[]) {
        if (!params[1]) {
            return this.suites.where(test => test.id === params[0], true);
        }

        const file = this._files.asUri(params[0]).toString();
        const line = parseInt(params[1], 10);

        return this.suites.where(
            test => this.findTestAtLine(test, file, line),
            true
        );
    }

    private findTestAtLine(
        test: TestSuiteNode | TestNode,
        file: string,
        line: number
    ) {
        if (test.file !== file) {
            return false;
        }

        const start = test.range.start.line;
        const end = test.range.end.line;

        return test instanceof TestSuiteNode
            ? line <= start || line >= end
            : line <= end;
    }

    private onTestLoadStartedEvent() {
        this.connection.onNotification(
            this.requestName('TestLoadStartedEvent'),
            async () => await this.loadTest()
        );
    }

    private onTestRunStartedEvent() {
        this.connection.onNotification(
            this.requestName('TestRunStartedEvent'),
            async ({ tests }) => {
                const id: string = tests[0] || 'root';
                const command =
                    id === 'root'
                        ? { command: 'phpunit.lsp.run-all', arguments: [] }
                        : {
                              command: 'phpunit.lsp.run-test-at-cursor',
                              arguments: [id],
                          };

                return this.executeCommand(command);
            }
        );
    }

    private onTestCancelEvent() {
        this.connection.onNotification(
            this.requestName('TestCancelEvent'),
            () => {
                return this.executeCommand({
                    command: 'php.lsp.cancel',
                    arguments: [],
                });
            }
        );
    }

    private async sendTestRunStartedEvent(tests: (TestSuiteNode | TestNode)[]) {
        const params = {
            tests: tests.map(test => test.id),
            events: this.events
                .put(tests)
                .where(event => event.state === 'running'),
        };

        this.connection.sendNotification('TestRunStartedEvent', params);

        await this.connection.sendRequest(
            this.requestName('TestRunStartedEvent'),
            params
        );
    }

    private async sendLoadTestFinishedEvent(suite: TestSuiteInfo) {
        await this.connection.sendRequest(
            this.requestName('TestLoadFinishedEvent'),
            {
                suite,
            }
        );
    }

    private async sendRunTestFinished(response: ITestResponse) {
        const params = {
            events: await this.changeEventsState(response),
        };

        this.connection.sendNotification('TestRunFinishedEvent', params);

        await this.connection.sendRequest(
            this.requestName('TestRunFinishedEvent'),
            params
        );

        this.connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response.toString(),
        });

        return response;
    }

    private async changeEventsState(response: ITestResponse) {
        const result = response.getTestResult();
        const state = result.tests === 0 ? 'errored' : 'passed';

        const events = this.events
            .where(event => event.state === 'running')
            .map(event => {
                if (event.type === 'suite') {
                    event.state = 'completed';

                    return event;
                }

                event.state = state;
                if (state === 'errored') {
                    event.message = response.toString();
                }

                return event;
            });

        const eventIds = events.map(event => this.getEventId(event));

        return this.events
            .put(events)
            .put(await response.asProblems())
            .where(test => eventIds.includes(this.getEventId(test)));
    }

    private getEventId(event: TestSuiteEvent | TestEvent) {
        return event.type === 'suite' ? event.suite : event.test;
    }

    private isFileChanged(event: FileEvent) {
        if (event.type !== FileChangeType.Deleted) {
            return true;
        }

        const suite = this.suites.get(event.uri);
        if (suite) {
            this.events.delete(suite);
            this.suites.delete(event.uri);
        }

        return false;
    }

    private requestName(name: string) {
        return [name, md5(this.workspaceFolder)].join('-');
    }
}
