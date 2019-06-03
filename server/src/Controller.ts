import files from './Filesystem';
import { Configuration } from './Configuration';
import { Params, TestRunner } from './TestRunner';
import { SpawnOptions } from 'child_process';
import { TestEvent, TestSuiteEvent } from './TestExplorer';
import { TestEventCollection } from './TestEventCollection';
import { TestNode, TestSuiteNode } from './Parser';
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
    FileChangeType,
    FileEvent,
} from 'vscode-languageserver';

export class Controller {
    public commands = [
        'phpunit.lsp.load',
        'phpunit.lsp.run-all',
        'phpunit.lsp.rerun',
        'phpunit.lsp.run-file',
        'phpunit.lsp.run-test-at-cursor',
        'phpunit.lsp.cancel',
    ];

    private commandLookup: Map<string, Function> = new Map([
        ['phpunit.lsp.run-all', this.runAll],
        ['phpunit.lsp.rerun', this.rerun],
        ['phpunit.lsp.run-file', this.runFile],
        ['phpunit.lsp.run-test-at-cursor', this.runTestAtCursor],
    ]);

    constructor(
        private connection: Connection,
        private config: Configuration,
        private suites: TestSuiteCollection,
        private events: TestEventCollection,
        private testRunner: TestRunner,
        private spawnOptions: SpawnOptions = {
            cwd: process.cwd(),
        },
        private _files = files
    ) {
        this.connection.onNotification('TestLoadStartedEvent', async () => {
            await this.sendLoadFinishedEvent();
        });

        this.connection.onNotification(
            'TestRunStartedEvent',
            async ({ tests }) => {
                const id: string = tests[0] || 'root';

                const command =
                    id === 'root'
                        ? { command: 'phpunit.lsp.run-all' }
                        : {
                              command: 'phpunit.lsp.run-test-at-cursor',
                              arguments: [this.suites.find(id).id],
                          };

                this.executeCommand(command);
            }
        );

        this.connection.onNotification('TestCancelStartedEvent', async () => {
            return await this.executeCommand({
                command: 'phpunit.lsp.cancel',
            });
        });
    }

    setSpawnOptions(spawnOptions: SpawnOptions) {
        this.spawnOptions = Object.assign({}, this.spawnOptions, spawnOptions);

        return this;
    }

    async detectChanges(
        change: DidChangeWatchedFilesParams | TextDocument
    ): Promise<CodeLens[]> {
        let changes = [];
        if (TextDocument.is(change)) {
            changes.push(
                Promise.resolve(
                    this.suites.putTextDocument(change).get(change.uri)
                )
            );
        } else {
            changes = change.changes
                .filter(event => this.filterFileChanged(event))
                .map(async event =>
                    (await this.suites.put(event.uri)).get(event.uri)
                );
        }

        const codeLens = (await Promise.all(changes))
            .filter(suite => !!suite)
            .reduce((codeLens: CodeLens[], suite) => {
                return codeLens.concat(suite!.exportCodeLens());
            }, []);

        if (codeLens.length > 0) {
            this.sendLoadFinishedEvent();
        }

        return codeLens;
    }

    async executeCommand(params: ExecuteCommandParams) {
        const command = params.command;
        const args = params.arguments || [];

        const response = this.commandLookup.has(command)
            ? await this.commandLookup.get(command)!.call(this, args)
            : await this.cancel();

        return response !== undefined
            ? await this.sendTestRunFinishedEvent(response)
            : undefined;
    }

    private async run(
        params: Params = {},
        tests: (TestSuiteNode | TestNode)[],
        rerun = false
    ) {
        this.sendTestRunStartedEvent(tests);

        this.testRunner
            .setPhpBinary(this.config.php)
            .setPhpUnitBinary(this.config.phpunit)
            .setArgs(this.config.args);

        return rerun === true
            ? await this.testRunner.rerun(params, this.spawnOptions)
            : await this.testRunner.run(params, this.spawnOptions);
    }

    private async runAll() {
        try {
            return await this.run({}, this.suites.all());
        } catch (e) {
            console.log(e);
        }

        return new TestResponse('failed');
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

        return await this.run(tests[0], tests);
    }

    private async cancel() {
        if (this.testRunner.cancel()) {
            return new TestResponse('cancel');
        }

        return undefined;
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

    private sendLoadStartedEvent() {
        this.connection.sendRequest('TestLoadStartedEvent');
    }

    private async sendLoadFinishedEvent() {
        this.suites.clear();
        this.events.clear();

        this.sendLoadStartedEvent();

        this.connection.sendRequest('TestLoadFinishedEvent', {
            suite: (await this.suites.load(this.config.files, {
                ignore: '**/vendor/**',
                cwd: this.spawnOptions.cwd,
            })).tree(),
        });
    }

    private sendTestRunStartedEvent(tests: (TestSuiteNode | TestNode)[]) {
        const params = {
            tests: tests.map(test => test.id),
            events: this.events
                .put(tests)
                .where(event => event.state === 'running'),
        };
        this.connection.sendNotification('TestRunStartedEvent', params);
        this.connection.sendRequest('TestRunStartedEvent', params);
    }

    private async sendTestRunFinishedEvent(response: TestResponse) {
        const params = {
            command: response.getCommand(),
            events: await this.changeEventsState(response),
        };

        this.connection.sendNotification('TestRunFinishedEvent', params);
        this.connection.sendRequest('TestRunFinishedEvent', params);

        this.connection.sendNotification(LogMessageNotification.type, {
            type: MessageType.Log,
            message: response.toString(),
        });

        return response;
    }

    private async changeEventsState(response: TestResponse) {
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

        return this.events
            .put(events)
            .put(await response.asProblems())
            .where(test =>
                events.some(
                    event => this.getEventId(test) === this.getEventId(event)
                )
            );
    }

    private filterFileChanged(event: FileEvent) {
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

    private getEventId(event: TestSuiteEvent | TestEvent) {
        return event.type === 'suite' ? event.suite : event.test;
    }
}
