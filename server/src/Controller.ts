import files from './Filesystem';
import { TestRunner } from './TestRunner';
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
            this.connection.sendRequest('TestLoadFinishedEvent', {
                suite: (await this.suites.load()).tree(),
            });
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

    async executeCommand(params: ExecuteCommandParams, options?: SpawnOptions) {
        const command = params.command;

        if (command === 'phpunit.lsp.run-all') {
            return await this.onTestRunFinishedEvent(
                await this.runAll(options)
            );
        }

        if (command === 'phpunit.lsp.run-file') {
            return await this.onTestRunFinishedEvent(
                await this.runFile(params.arguments || [], options)
            );
        }

        return await this.onTestRunFinishedEvent(
            await this.run(
                params.arguments || [],
                command === 'phpunit.lsp.run-test-at-cursor',
                options
            )
        );
    }

    private async runAll(options?: SpawnOptions) {
        await this.onTestRunStartedEvent(this.suites.all());

        return await this.testRunner.run({}, options);
    }

    private async runFile(params: string[], options?: SpawnOptions) {
        const idOrFile: string = params[0] || '';
        const tests = this.suites.where(
            test => test.id === idOrFile || test.file === idOrFile
        );

        await this.onTestRunStartedEvent(tests);

        return await this.testRunner.run({ file: tests[0].file }, options);
    }

    private async run(params: string[], reurn = false, options?: SpawnOptions) {
        let tests: (TestSuite | Test)[] = [];

        if (params[1]) {
            const file = this._files.asUri(params[0]).toString();
            const line = parseInt(params[1], 10);

            tests = this.suites.where(
                test => this.findByFileAndLine(test, file, line),
                true
            );
        } else {
            const id = params[0];
            tests = this.suites.where(test => test.id === id, true);
        }

        await this.onTestRunStartedEvent(tests);

        return reurn
            ? await this.testRunner.rerun(tests[0], options)
            : await this.testRunner.run(tests[0], options);
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

        return test.type === 'suite'
            ? start <= line || end >= line
            : end <= line;
    }

    private async onTestRunStartedEvent(tests: (TestSuite | Test)[]) {
        this.connection.sendNotification('TestRunStartedEvent');
        await this.connection.sendRequest('TestRunStartedEvent', {
            tests: tests.map(test => test.id),
            events: this.events
                .put(tests)
                .where(event => event.state === 'running'),
        });
    }

    private async onTestRunFinishedEvent(response: TestResponse) {
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
