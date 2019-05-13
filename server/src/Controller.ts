import files from './Filesystem';
import {
    Connection,
    ExecuteCommandParams,
    LogMessageNotification,
    MessageType,
} from 'vscode-languageserver';
import { SpawnOptions } from 'child_process';
import { TestEventCollection } from './TestEventCollection';
import { TestRunner } from './TestRunner';
import { TestSuiteCollection } from './TestSuiteCollection';
import { TestResponse } from './TestResponse';

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

        this.connection.onRequest('TestRunStartedEvent', ({ tests }) => {
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
        params: ExecuteCommandParams,
        options?: SpawnOptions
    ): Promise<void> {
        const command = params.command;
        const args = params.arguments || [];
        let idOrFile: string = args[0] || '';
        let response: TestResponse;

        if (command === 'phpunit.lsp.run-all') {
            this.events.put(this.suites.all());

            const events = this.events.all();

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: events.map(test =>
                    test.type === 'suite' ? test.suite : test.test
                ),
                events: events,
            });

            response = await this.testRunner.run({}, options);
        } else if (command === 'phpunit.lsp.run-file') {
            const tests = this.suites.where(
                test => test.id === idOrFile || test.file === idOrFile
            );

            this.events.put(tests);

            const events = this.events.where(
                event => event.state === 'running'
            );

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: events.map(event =>
                    event.type === 'suite' ? event.suite : event.test
                ),
                events: events,
            });

            response = await this.testRunner.run(
                { file: tests[0].file },
                options
            );
        } else if (
            ['phpunit.lsp.run-test-at-cursor', 'phpunit.lsp.rerun'].includes(
                command
            )
        ) {
            const line: number = args[1] ? parseInt(args[1], 10) : undefined;

            if (line !== undefined) {
                idOrFile = this._files.asUri(idOrFile).toString();
            }

            const tests = this.suites.where(test => {
                if (test.id === idOrFile) {
                    return true;
                }

                if (test.file !== idOrFile) {
                    return false;
                }

                const start = test.range.start.line;
                const end = test.range.end.line;

                return test.type === 'suite'
                    ? start >= line || end <= line
                    : end >= line;
            });

            this.events.put(tests);

            const events = this.events.where(
                event => event.state === 'running'
            );

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: events.map(event =>
                    event.type === 'suite' ? event.suite : event.test
                ),
                events: events,
            });

            response =
                command === 'phpunit.lsp.rerun'
                    ? await this.testRunner.rerun(tests[0], options)
                    : await this.testRunner.run(tests[0], options);
        }

        this.events
            .put(this.setEventsCompleted())
            .put(await response.asProblem());

        this.connection.sendRequest('TestRunFinishedEvent', {
            events: this.events.all(),
        });

        this.connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response.toString(),
        });
    }

    private setEventsCompleted() {
        return this.events
            .where(test => test.state === 'running')
            .map(event => {
                event.state = event.type === 'suite' ? 'completed' : 'passed';

                return event;
            });
    }
}
