import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
    CancellationToken, debug, OutputChannel, TestController, TestItem, TestItemCollection, TestRun, TestRunProfileKind,
    TestRunRequest, workspace,
} from 'vscode';
import { CloverParser } from './CloverParser';
import { Configuration } from './Configuration';
import { OutputChannelObserver, Printer, TestResultObserver } from './Observers';
import { MessageObserver } from './Observers/MessageObserver';
import { Builder, PHPUnitXML, TestRunner, TestRunnerEvent, TestType } from './PHPUnit';
import { TestCase, TestCollection } from './TestCollection';
import { getFreePort } from './utils';

export class Handler {
    private previousRequest: TestRunRequest | undefined;

    constructor(
        private ctrl: TestController,
        private phpUnitXML: PHPUnitXML,
        private configuration: Configuration,
        private testCollection: TestCollection,
        private outputChannel: OutputChannel,
        private printer: Printer,
    ) { }

    getPreviousRequest() {
        return this.previousRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const command = new Builder(this.configuration, { cwd: this.phpUnitXML.root() });
        if (request.profile?.kind === TestRunProfileKind.Debug) {
            const extra = ['-dxdebug.mode=debug', '-dxdebug.start_with_request=1'];

            const wsf = workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
            const debuggerConfigName = this.configuration.get('debuggerConfig') as string | undefined;

            if (debuggerConfigName) {
                await debug.startDebugging(wsf, debuggerConfigName);
            } else {
                const freePort = this.configuration.get('xdebugPort', 0) || await getFreePort();
                extra.push(`-dxdebug.client_port=${freePort}`);
                const debuggerConfig = { type: 'php', request: 'launch', name: 'PHPUnit', port: freePort };
                await debug.startDebugging(wsf, debuggerConfig);
            }
            // TODO: perhaps wait for the debug session
            command.setExtra(extra);
            // eslint-disable-next-line @typescript-eslint/naming-convention
            command.setExtraEnvironment({ XDEBUG_MODE: 'debug' });
        }

        if (request.profile?.kind === TestRunProfileKind.Coverage) {
            command.setExtra(['-dxdebug.mode=coverage']);
            // eslint-disable-next-line @typescript-eslint/naming-convention
            command.setExtraEnvironment({ XDEBUG_MODE: 'coverage' });
        }

        const testRun = this.ctrl.createTestRun(request);
        await this.runTestQueue(command, testRun, request, cancellation);

        if (request.profile?.kind === TestRunProfileKind.Debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(debug.activeDebugSession);
        }

        this.previousRequest = request;
    }

    private async runTestQueue(builder: Builder, testRun: TestRun, request: TestRunRequest, cancellation?: CancellationToken) {
        const queue = await this.discoverTests(request.include ?? this.gatherTestItems(this.ctrl.items), request);
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, this.printer, request));
        runner.observe(new MessageObserver(this.configuration));

        let tmpd: string | undefined;
        if (request.profile?.kind === TestRunProfileKind.Coverage) {
            tmpd = await fs.mkdtemp(path.join(os.tmpdir(), 'phpunit'));
            builder.setExtraArguments(['--coverage-clover', path.join(tmpd, 'phpunit-0.xml')]);
        }

        runner.emit(TestRunnerEvent.start, undefined);

        const processes = !request.include
            ? [runner.run(builder)]
            : request.include
                .map((testItem) => this.testCollection.getTestCase(testItem)!)
                .map((testCase, k) => testCase.update(tmpd ? builder.setExtraArguments(['--coverage-clover', path.join(tmpd, `phpunit-${k}.xml`)]) : builder))
                .map((testCase) => runner.run(testCase));

        cancellation?.onCancellationRequested(() => processes.forEach((process) => process.abort()));

        await Promise.all(processes.map((process) => process.run()));

        if (tmpd) {
            for (let i = 0; i < (!request.include ? 1 : request.include!.length); i++) {
                const covs = await CloverParser.parseClover(path.join(tmpd, `phpunit-${i}.xml`));
                covs.map(c => testRun.addCoverage(c));
            }
            await fs.rm(tmpd, { recursive: true, force: true });
        }

        runner.emit(TestRunnerEvent.done, undefined);
    };

    private async discoverTests(tests: Iterable<TestItem>, request: TestRunRequest, queue = new Map<TestCase, TestItem>()) {
        for (const testItem of tests) {
            if (request.exclude?.includes(testItem)) {
                continue;
            }

            const testCase = this.testCollection.getTestCase(testItem);
            if (testCase?.type === TestType.method) {
                queue.set(testCase, testItem);
            } else {
                await this.discoverTests(this.gatherTestItems(testItem.children), request, queue);
            }
        }

        return queue;
    };

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }
}