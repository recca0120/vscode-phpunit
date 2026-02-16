import { inject, injectable } from 'inversify';
import type { CancellationToken, TestController, TestRun, TestRunRequest } from 'vscode';
import { CoverageCollector } from '../Coverage';
import {
    FilterStrategyFactory,
    type ProcessBuilder,
    type TestDefinition,
    type TestRunner,
    TestRunnerEvent,
    type TestRunnerProcess,
} from '../PHPUnit';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';
import { DebugSessionManager } from './DebugSessionManager';
import { ProcessBuilderFactory } from './ProcessBuilderFactory';
import { TestQueueBuilder } from './TestQueueBuilder';
import { TestRunnerBuilder } from './TestRunnerBuilder';

@injectable()
export class TestRunHandler {
    private previousRequest: TestRunRequest | undefined;
    private lastRunAt = 0;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(ProcessBuilderFactory) private processBuilderFactory: ProcessBuilderFactory,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TestRunnerBuilder) private testRunnerBuilder: TestRunnerBuilder,
        @inject(CoverageCollector) private coverageCollector: CoverageCollector,
        @inject(TestQueueBuilder) private testQueueBuilder: TestQueueBuilder,
        @inject(DebugSessionManager) private debugSession: DebugSessionManager,
    ) {}

    getPreviousRequest() {
        return this.previousRequest;
    }

    getLastRunAt() {
        return this.lastRunAt;
    }

    async startTestRun(request: TestRunRequest, cancellation?: CancellationToken) {
        const builder = await this.processBuilderFactory.create(request.profile?.kind);
        const xdebug = builder.getXdebug();

        await this.debugSession.wrap(xdebug, async () => {
            const testRun = this.ctrl.createTestRun(request);
            await this.runTestQueue(builder, testRun, request, cancellation);
        });

        this.previousRequest = request;
        this.lastRunAt = Date.now();
    }

    private async runTestQueue(
        builder: ProcessBuilder,
        testRun: TestRun,
        request: TestRunRequest,
        cancellation?: CancellationToken,
    ) {
        const queue = request.include
            ? await this.testQueueBuilder.build(request.include, request, undefined, testRun)
            : await this.testQueueBuilder.buildFromCollection(this.ctrl.items, request, testRun);

        const runner = this.testRunnerBuilder.build(queue, testRun, request);
        runner.emit(TestRunnerEvent.start, undefined);

        try {
            const processes = this.createProcesses(runner, builder, request);
            cancellation?.onCancellationRequested(() => {
                for (const process of processes) {
                    process.abort();
                }
            });

            await this.runProcesses(processes, cancellation);
            await this.coverageCollector.collect(processes, testRun);
        } finally {
            runner.emit(TestRunnerEvent.done, undefined);
        }
    }

    private async runProcesses(
        processes: TestRunnerProcess[],
        cancellation?: CancellationToken,
    ): Promise<void> {
        for (const process of processes) {
            if (cancellation?.isCancellationRequested) {
                break;
            }

            await process.run();
        }
    }

    private createProcesses(runner: TestRunner, builder: ProcessBuilder, request: TestRunRequest) {
        if (!request.include) {
            return [runner.run(builder)];
        }

        return request.include
            .map((testItem) => this.testCollection.getTestDefinition(testItem))
            .filter((testDef): testDef is TestDefinition => testDef !== undefined)
            .map((testDef, index) => this.configureBuilderForTestCase(builder, testDef, index))
            .map((configured) => runner.run(configured));
    }

    private configureBuilderForTestCase(
        builder: ProcessBuilder,
        testDefinition: TestDefinition,
        index: number,
    ): ProcessBuilder {
        const filter = FilterStrategyFactory.create(testDefinition).getFilter();
        return builder
            .clone()
            .setXdebug(builder.getXdebug()?.clone().setIndex(index))
            .setArguments(filter);
    }
}
