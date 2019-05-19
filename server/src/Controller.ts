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
    [index: string]: any;

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
        private spawnOptions: SpawnOptions = {
            cwd: process.cwd(),
        },
        private _files = files
    ) {
        this.connection.onRequest('TestLoadStartedEvent', async () => {
            await this.sendLoadFinishedEvent();
        });

        this.connection.onRequest('TestRunStartedEvent', async ({ tests }) => {
            const id: string = tests[0] || 'root';

            const command =
                id === 'root'
                    ? { command: 'phpunit.lsp.run-all' }
                    : {
                          command: 'phpunit.lsp.run-test-at-cursor',
                          arguments: [this.suites.find(id).id],
                      };

            this.executeCommand(command);
        });
    }

    setSpawnOptions(spawnOptions: SpawnOptions) {
        this.spawnOptions = Object.assign({}, this.spawnOptions, spawnOptions);

        return this;
    }

    async detectChanges(
        change: DidChangeWatchedFilesParams | TextDocument
    ): Promise<CodeLens[]> {
        const changes = TextDocument.is(change)
            ? [
                  Promise.resolve(
                      this.suites.putTextDocument(change).get(change.uri)
                  ),
              ]
            : change.changes.map(async event => {
                  await this.suites.put(event.uri);

                  return await this.suites.get(event.uri);
              });

        const suites: (TestSuite | undefined)[] = (await Promise.all(
            changes
        )).filter(suite => !!suite);

        if (suites.length === 0) {
            return [];
        }

        const codeLens = suites.reduce((codeLens: CodeLens[], suite) => {
            return codeLens.concat(suite!.exportCodeLens());
        }, []);

        this.sendLoadFinishedEvent({ started: false });

        return codeLens;
    }

    async executeCommand(params: ExecuteCommandParams) {
        const command = params.command;
        const args = params.arguments || [];

        const lookup = {
            'phpunit.lsp.run-all': this.runAll,
            'phpunit.lsp.run-file': this.runFile,
            'phpunit.lsp.run-test-at-cursor': this.runTestAtCursor,
        } as any;

        const response = lookup[command]
            ? await lookup[command].call(this, args)
            : await this.rerun(args);

        return await this.sendTestRunFinishedEvent(response);
    }

    private async run(
        params: Params = {},
        tests: (TestSuite | Test)[],
        rerun = false
    ) {
        await this.sendTestRunStartedEvent(tests);

        return rerun === true
            ? await this.testRunner.rerun(params, this.spawnOptions)
            : await this.testRunner.run(params, this.spawnOptions);
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

        return await this.run(tests[0], tests);
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

    private findTestAtLine(test: TestSuite | Test, file: string, line: number) {
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
            suite: (await this.suites.load(this.spawnOptions.cwd)).tree(),
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
