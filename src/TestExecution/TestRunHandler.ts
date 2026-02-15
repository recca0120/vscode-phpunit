import { inject, injectable } from 'inversify';
import {
    type CancellationToken,
    debug,
    type TestController,
    type TestRun,
    type TestRunRequest,
    workspace,
} from 'vscode';
import { CoverageCollector } from '../Coverage';
import {
    FilterStrategyFactory,
    Mode,
    type ProcessBuilder,
    type TestRunner,
    TestRunnerEvent,
    type Xdebug,
} from '../PHPUnit';
import { type TestCase, TestCollection } from '../TestCollection';
import type { ProcessBuilderFactory } from '../types';
import { TYPES } from '../types';
import { TestQueueBuilder } from './TestQueueBuilder';
import { TestRunnerBuilder } from './TestRunnerBuilder';

@injectable()
export class TestRunHandler {
    private previousRequest: TestRunRequest | undefined;
    private lastRunAt = 0;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(TYPES.ProcessBuilderFactory) private createProcessBuilder: ProcessBuilderFactory,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TestRunnerBuilder) private testRunnerBuilder: TestRunnerBuilder,
        @inject(CoverageCollector) private coverageCollector: CoverageCollector,
        @inject(TestQueueBuilder) private testQueueBuilder: TestQueueBuilder,
    ) {}

    getPreviousRequest() {
        return this.previousRequest;
    }

    getLastRunAt() {
        return this.lastRunAt;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const builder = await this.createProcessBuilder(request.profile?.kind);
        const xdebug = builder.getXdebug()!;

        await this.manageDebugSession(xdebug, async () => {
            const testRun = this.ctrl.createTestRun(request);
            await this.runTestQueue(builder, testRun, request, cancellation);
        });

        this.previousRequest = request;
        this.lastRunAt = Date.now();
    }

    private async manageDebugSession(xdebug: Xdebug, fn: () => Promise<void>): Promise<void> {
        if (xdebug.mode === Mode.debug) {
            const wsf = workspace.getWorkspaceFolder(this.testCollection.getRootUri());
            // TODO(#346): await debug session attachment before running tests
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
            .map((testCase, index) => this.configureBuilderForTestCase(builder, testCase, index))
            .map((configured) => runner.run(configured));
    }

    private configureBuilderForTestCase(
        builder: ProcessBuilder,
        testCase: TestCase,
        index: number,
    ): ProcessBuilder {
        const filter = FilterStrategyFactory.create(testCase.definition).getFilter();
        return builder
            .clone()
            .setXdebug(builder.getXdebug()?.clone().setIndex(index))
            .setArguments(filter);
    }
}
