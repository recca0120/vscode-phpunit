import {
    type CancellationToken,
    debug,
    type TestController,
    type TestRun,
    type TestRunRequest,
    workspace,
} from 'vscode';
import type { Configuration } from './Configuration';
import type { CoverageCollector } from './CoverageCollector';
import { type PHPUnitXML, ProcessBuilder, type TestRunner, TestRunnerEvent } from './PHPUnit';
import { Mode, Xdebug } from './PHPUnit/ProcessBuilder/Xdebug';
import type { TestCollection } from './TestCollection';
import type { TestQueueBuilder } from './TestQueueBuilder';
import type { TestRunnerBuilder } from './TestRunnerBuilder';

export class TestRunHandler {
    private previousRequest: TestRunRequest | undefined;

    constructor(
        private ctrl: TestController,
        private phpUnitXML: PHPUnitXML,
        private configuration: Configuration,
        private testCollection: TestCollection,
        private testRunnerBuilder: TestRunnerBuilder,
        private coverageCollector: CoverageCollector,
        private testQueueBuilder: TestQueueBuilder,
    ) {}

    getPreviousRequest() {
        return this.previousRequest;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const builder = await this.createProcessBuilder(request);
        const xdebug = builder.getXdebug()!;

        await this.manageDebugSession(xdebug, async () => {
            const testRun = this.ctrl.createTestRun(request);
            await this.runTestQueue(builder, testRun, request, cancellation);
        });

        this.previousRequest = request;
    }

    private async createProcessBuilder(request: TestRunRequest): Promise<ProcessBuilder> {
        const builder = new ProcessBuilder(this.configuration, { cwd: this.phpUnitXML.root() });
        const xdebug = new Xdebug(this.configuration);
        builder.setXdebug(xdebug);
        await xdebug.setMode(request.profile?.kind);

        return builder;
    }

    private async manageDebugSession(xdebug: Xdebug, fn: () => Promise<void>): Promise<void> {
        if (xdebug.mode === Mode.debug) {
            const wsf = workspace.getWorkspaceFolder(this.testCollection.getWorkspace());
            // TODO: perhaps wait for the debug session
            await debug.startDebugging(wsf, xdebug.name ?? (await xdebug.getDebugConfiguration()));
        }

        await fn();

        if (xdebug.mode === Mode.debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(debug.activeDebugSession);
        }
    }

    async startGroupTestRun(group: string, cancellation?: CancellationToken) {
        const builder = new ProcessBuilder(this.configuration, { cwd: this.phpUnitXML.root() });
        builder.setArguments(`--group ${group}`);

        const request = new TestRunRequest();
        const testRun = this.ctrl.createTestRun(request);

        const queue = await this.testQueueBuilder.build(
            this.testQueueBuilder.collectItems(this.ctrl.items),
            request,
        );
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = this.testRunnerBuilder.build(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        const process = runner.run(builder);
        cancellation?.onCancellationRequested(() => process.abort());

        await process.run();
        runner.emit(TestRunnerEvent.done, undefined);
        testRun.end();
    }

    private async runTestQueue(
        builder: ProcessBuilder,
        testRun: TestRun,
        request: TestRunRequest,
        cancellation?: CancellationToken,
    ) {
        const queue = await this.testQueueBuilder.build(
            request.include ?? this.testQueueBuilder.collectItems(this.ctrl.items),
            request,
        );
        queue.forEach((testItem) => testRun.enqueued(testItem));

        const runner = this.testRunnerBuilder.build(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        const processes = this.createProcesses(runner, builder, request);
        cancellation?.onCancellationRequested(() =>
            processes.forEach((process) => process.abort()),
        );

        await Promise.all(processes.map((process) => process.run()));
        await this.coverageCollector.collect(processes, testRun);

        runner.emit(TestRunnerEvent.done, undefined);
    }

    private createProcesses(runner: TestRunner, builder: ProcessBuilder, request: TestRunRequest) {
        if (!request.include) {
            return [runner.run(builder)];
        }

        return request.include
            .map((testItem) => this.testCollection.getTestCase(testItem)!)
            .map((testCase, index) => testCase.configureProcessBuilder(builder, index))
            .map((builder) => runner.run(builder));
    }
}
