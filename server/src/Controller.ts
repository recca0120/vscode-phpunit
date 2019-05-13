import files from './Filesystem';
import { Connection, ExecuteCommandParams } from 'vscode-languageserver';
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
            }

            const test = this.suites.find(id);

            this.executeCommand({
                command: 'phpunit.lsp.run-test-at-cursor',
                arguments: [test.id],
            });
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

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: ['root'],
                events: this.events.all(),
            });

            response = await this.testRunner.run({}, options);
        } else if (command === 'phpunit.lsp.run-file') {
            const tests = this.suites.where(
                test => test.id === idOrFile || test.file === idOrFile
            );

            const test = tests[0];

            this.events.put(tests);

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: tests.map(test => test.id),
                events: this.events.where(event => event.state === 'running'),
            });

            response = await this.testRunner.run({ file: test.file }, options);
        } else if (command === 'phpunit.lsp.run-test-at-cursor') {
            idOrFile =
                idOrFile.indexOf('::') === -1
                    ? idOrFile
                    : this._files.asUri(idOrFile).toString();

            const line: number = args[1] ? parseInt(args[1], 10) : 0;
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

            const test = tests[0];

            this.events.put(tests);

            this.connection.sendRequest('TestRunStartedEvent', {
                tests: tests.map(test => test.id),
                events: this.events.where(event => event.state === 'running'),
            });

            response = await this.testRunner.run(
                {
                    file: test.file,
                    method: test.method,
                    depends: test.depends,
                },
                options
            );
        }

        this.connection.sendRequest('TestRunFinishedEvent', {
            events: this.events.all().map(event => {
                event.state = event.type === 'suite' ? 'completed' : 'passed';

                return event;
            }),
        });
    }
}
