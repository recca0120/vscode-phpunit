import files from './Filesystem';
import { TestRunner, Params } from './TestRunner';
import { Problem } from './ProblemMatcher';
import { SpawnOptions } from 'child_process';
import { Test, TestSuite } from './Parser';
import { TestEventCollection } from './TestEventCollection';
import { TestResponse } from './TestResponse';
import { TestSuiteCollection } from './TestSuiteCollection';
import {
    Connection,
    ExecuteCommandParams,
    LogMessageNotification,
    MessageType,
    DidChangeWatchedFilesParams,
    CodeLens,
    TextDocument,
} from 'vscode-languageserver';
import { TestSuiteEvent, TestEvent } from './TestExplorer';

export class Controller {
    public commands = [
        'phpunit.lsp.load',
        'phpunit.lsp.run-all',
        'phpunit.lsp.rerun',
        'phpunit.lsp.run-file',
        'phpunit.lsp.run-test-at-cursor',
        'phpunit.lsp.cancel',
    ];

    constructor(
        private connection: Connection,
        private suites: TestSuiteCollection,
        private events: TestEventCollection,
        private testRunner: TestRunner,
        private _files = files
    ) {
        this.connection.onRequest('TestLoadStartedEvent', async () => {
            await this.sendLoadFinishedEvent();
        });

        this.connection.onRequest('TestRunStartedEvent', async ({ tests }) => {
            const id: string = tests[0] || 'root';

            if (id === 'root') {
                this.executeCommand({
                    command: 'phpunit.lsp.run-all',
                });

                return;
            }

            const test = this.suites.find(id);
            this.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [test.id],
            });
        });
    }

    async detectChanges(
        change: DidChangeWatchedFilesParams | TextDocument
    ): Promise<CodeLens[]> {
        let suites: (TestSuite | undefined)[] = [];

        if (TextDocument.is(change)) {
            suites = [this.suites.putTextDocument(change).get(change.uri)];
        } else {
            suites = await Promise.all(
                change.changes.map(event =>
                    this.suites.put(event.uri).then(() => {
                        return this.suites.get(event.uri);
                    })
                )
            );
        }

        suites = suites.filter(suite => !!suite);

        if (suites.length === 0) {
            return [];
        }

        const codeLens = suites.reduce((codeLens: CodeLens[], suite) => {
            return codeLens.concat(suite!.exportCodeLens());
        }, []);

        this.sendLoadFinishedEvent({ started: false });

        return codeLens;
    }

    async executeCommand(params: ExecuteCommandParams, options?: SpawnOptions) {
        let response: TestResponse;
        const command = params.command;

        if (command === 'phpunit.lsp.run-all') {
            response = await this.runAll(options);
        } else if (command === 'phpunit.lsp.run-file') {
            response = await this.runFile(params.arguments || [], options);
        } else {
            response = await this.runTestAtCursor(
                params.arguments || [],
                options,
                command === 'phpunit.lsp.run-test-at-cursor'
            );
        }

        return await this.sendTestRunFinishedEvent(response);
    }

    private async runAll(options?: SpawnOptions) {
        return await this.run({}, this.suites.all(), options);
    }

    private async runFile(params: string[], options?: SpawnOptions) {
        const idOrFile: string = params[0] || '';
        const tests = this.suites.where(
            test => test.id === idOrFile || test.file === idOrFile
        );

        return await this.run({ file: tests[0].file }, tests, options);
    }

    private async runTestAtCursor(
        params: string[],
        options?: SpawnOptions,
        runTestAtCursor = true
    ) {
        let tests: (TestSuite | Test)[] = [];

        if (params[1]) {
            const file = this._files.asUri(params[0]).toString();
            const line = parseInt(params[1], 10);

            tests = this.suites.where(
                test => this.findByFileAndLine(test, file, line),
                true
            );
        } else {
            tests = this.suites.where(test => test.id === params[0], true);
        }

        return await this.run(tests[0], tests, options, runTestAtCursor);
    }

    private async run(
        params: Params = {},
        tests: (TestSuite | Test)[],
        options?: SpawnOptions,
        runTestAtCursor = true
    ) {
        await this.sendTestRunStartedEvent(tests);

        return runTestAtCursor === true
            ? await this.testRunner.run(params, options)
            : await this.testRunner.rerun(params, options);
    }

    private findByFileAndLine(
        test: TestSuite | Test,
        file: string,
        line: number
    ) {
        if (test.file !== file) {
            return false;
        }

        const start = test.range.start.line;
        const end = test.range.end.line;

        return test instanceof TestSuite
            ? line <= start || line >= end
            : line <= end;
    }

    private async sendLoadFinishedEvent(
        params: { started: boolean } = { started: true }
    ) {
        await this.connection.sendRequest('TestLoadFinishedEvent', {
            suite: (await this.suites.load()).tree(),
            started: params.started,
        });
    }

    private async sendTestRunStartedEvent(tests: (TestSuite | Test)[]) {
        this.connection.sendNotification('TestRunStartedEvent');

        await this.connection.sendRequest('TestRunStartedEvent', {
            tests: tests.map(test => test.id),
            events: this.events
                .put(tests)
                .where(event => event.state === 'running'),
        });
    }

    private async sendTestRunFinishedEvent(response: TestResponse) {
        this.connection.sendRequest('TestRunFinishedEvent', {
            events: this.changeEventsState(
                response,
                await response.asProblem()
            ),
        });

        this.connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response.toString(),
        });

        return response;
    }

    private changeEventsState(response: TestResponse, problems: Problem[]) {
        const errorPattern = [
            'Fatal error: Uncaught Error',
            'Usage: phpunit \\[options\\] UnitTest',
        ].join('|');

        let state: TestEvent['state'] = 'passed';
        if (new RegExp(errorPattern, 'i').test(response.toString())) {
            state = 'errored';
        }

        const events = this.events
            .where(event => event.state === 'running')
            .map(event => {
                event.state = event.type === 'suite' ? 'completed' : state;

                return event;
            });

        return this.events
            .put(events)
            .put(problems)
            .where(test =>
                events.some(
                    event => this.getEventId(test) === this.getEventId(event)
                )
            );
    }

    private getEventId(event: TestSuiteEvent | TestEvent) {
        return event.type === 'suite' ? event.suite : event.test;
    }
}
