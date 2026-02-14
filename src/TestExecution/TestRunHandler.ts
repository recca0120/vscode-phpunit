import { inject, injectable } from 'inversify';
import {
    type CancellationToken,
    debug,
    type TestController,
    type TestRun,
    type TestRunRequest,
    workspace,
} from 'vscode';
import { Configuration } from '../Configuration';
import { CoverageCollector } from '../Coverage';
import {
    Mode,
    PHPUnitXML,
    ProcessBuilder,
    type TestRunner,
    TestRunnerEvent,
    Xdebug,
} from '../PHPUnit';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';
import { TestQueueBuilder } from './TestQueueBuilder';
import { TestRunnerBuilder } from './TestRunnerBuilder';

@injectable()
export class TestRunHandler {
    private previousRequest: TestRunRequest | undefined;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(Configuration) private configuration: Configuration,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TestRunnerBuilder) private testRunnerBuilder: TestRunnerBuilder,
        @inject(CoverageCollector) private coverageCollector: CoverageCollector,
        @inject(TestQueueBuilder) private testQueueBuilder: TestQueueBuilder,
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
