import files from './Filesystem';
import {
    Connection,
    ExecuteCommandParams,
    LogMessageNotification,
    MessageType,
} from 'vscode-languageserver';
import { SpawnOptions } from 'child_process';
import { TestEventCollection } from './TestEventCollection';
import { TestRunner, Params } from './TestRunner';
import { TestSuiteCollection } from './TestSuiteCollection';
import { TestResponse } from './TestResponse';
import { TestSuite, Test } from './Parser';
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
            } else {
                const test = this.suites.find(id);

                this.executeCommand({
                    command: 'phpunit.lsp.run-test-at-cursor',
                    arguments: [test.id],
                });
            }
        });
    }

    async executeCommand(
        _params: ExecuteCommandParams,
        options?: SpawnOptions
    ): Promise<TestResponse> {
        const command = _params.command;
        const args = _params.arguments || [];

        let idOrFile: string = args[0] || '';
        let tests: (TestSuite | Test)[] = [];
        let params: Params = {};

        if (command === 'phpunit.lsp.run-all') {
            tests = this.suites.all();
        } else if (command === 'phpunit.lsp.run-file') {
            tests = this.suites.where(
                test => test.id === idOrFile || test.file === idOrFile
            );

            params = {
                file: tests[0].file,
            };
        } else {
            const line: number = args[1] ? parseInt(args[1], 10) : undefined;

            if (line !== undefined) {
                idOrFile = this._files.asUri(idOrFile).toString();
            }

            tests = this.suites.where(test =>
                this.filterByIdOrFile(test, idOrFile, line)
            );

            params = tests[0];
        }

        this.events.put(tests);

        let events = this.events.where(event => event.state === 'running');

        this.connection.sendRequest('TestRunStartedEvent', {
            tests: tests.map(test => test.id),
            events,
        });

        const response =
            command === 'phpunit.lsp.rerun'
                ? await this.testRunner.rerun(params, options)
                : await this.testRunner.run(params, options);

        events = this.events
            .put(this.setEventsCompleted(events))
            .put(await response.asProblem())
            .where(event =>
                events.some(ev => this.getTestId(ev) === this.getTestId(event))
            );

        this.connection.sendRequest('TestRunFinishedEvent', {
            events,
        });

        this.connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response.toString(),
        });

        return response;
    }

    private filterByIdOrFile(
        test: TestSuite | Test,
        idOrFile: string,
        line: number | undefined
    ) {
        if (test.id === idOrFile) {
            return true;
        }

        if (test.file !== idOrFile) {
            return false;
        }

        const start = test.range.start.line;
        const end = test.range.end.line;

        return test.type === 'suite'
            ? start <= line || end >= line
            : end <= line;
    }

    private setEventsCompleted(events: (TestSuiteEvent | TestEvent)[]) {
        return events.map(event => {
            if (event.type === 'suite') {
                event.state = 'completed';
            } else {
                event.state = 'passed';
                event.decorations = [];
            }

            return event;
        });
    }

    private getTestId(event: TestSuiteEvent | TestEvent) {
        return event.type === 'suite' ? event.suite : event.test;
    }
}
