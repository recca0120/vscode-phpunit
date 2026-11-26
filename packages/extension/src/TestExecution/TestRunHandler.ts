import {
    CoverageFiles,
    FilterStrategyFactory,
    type ProcessBuilder,
    type TestDefinition,
    TestRunner,
    TestRunnerEvent,
    type TestRunnerProcess,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type {
    CancellationToken,
    Disposable,
    TestController,
    TestItem,
    TestRun,
    TestRunRequest,
} from 'vscode';
import { FileCoverageAdapter } from '../FileCoverageAdapter';
import { ObserverFactory } from '../Observers';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';
import { DebugSessionManager } from './DebugSessionManager';
import { ProcessBuilderFactory } from './ProcessBuilderFactory';
import { TestQueueBuilder } from './TestQueueBuilder';

@injectable()
export class TestRunHandler {
    private previousRequest: TestRunRequest | undefined;
    private lastRunAt = 0;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(ProcessBuilderFactory) private processBuilderFactory: ProcessBuilderFactory,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(ObserverFactory) private observerFactory: ObserverFactory,
        @inject(TestQueueBuilder) private testQueueBuilder: TestQueueBuilder,
        @inject(DebugSessionManager) private debugSession: DebugSessionManager,
    ) {}

    getPreviousRequest() {
        return this.previousRequest;
    }

    getLastRunAt() {
        return this.lastRunAt;
    }

    async startTestRun(
        request: TestRunRequest,
        include?: readonly TestItem[],
        cancellation?: CancellationToken,
    ) {
        const builder = await this.processBuilderFactory.create(request.profile?.kind);
        const coverage = builder.getXdebug()?.isCoverageMode()
            ? new CoverageFiles(builder.getCwd())
            : undefined;
        await coverage?.prepare();

        await this.debugSession.wrap(builder.getXdebug(), async () => {
            const testRun = this.ctrl.createTestRun(request);
            await this.runTestQueue(builder, testRun, request, include, cancellation, coverage);
        });

        if (request.continuous) {
            return;
        }

        this.previousRequest = request;
        this.lastRunAt = Date.now();
    }

    private async runTestQueue(
        builder: ProcessBuilder,
        testRun: TestRun,
        request: TestRunRequest,
        include?: readonly TestItem[],
        cancellation?: CancellationToken,
        coverage?: CoverageFiles,
    ) {
        const items = include ?? request.include;
        const queue = items
            ? await this.testQueueBuilder.build(items, request, undefined, testRun)
            : await this.testQueueBuilder.buildFromCollection(this.ctrl.items, request, testRun);

        const runner = new TestRunner();
        for (const observer of this.observerFactory.create(queue, testRun)) {
            runner.observe(observer);
        }
        runner.emit(TestRunnerEvent.start, undefined);

        let cancellationListener: Disposable | undefined;
        try {
            const processes = this.createProcesses(runner, builder, items, coverage);
            cancellationListener = cancellation?.onCancellationRequested(() => {
                for (const process of processes) {
                    process.abort();
                }
            });

            await this.runProcesses(processes, cancellation);
            if (cancellation?.isCancellationRequested) {
                runner.emit(TestRunnerEvent.abort, undefined);
            }
            await this.collectCoverage(processes, testRun);
        } finally {
            cancellationListener?.dispose();
            runner.emit(TestRunnerEvent.done, undefined);
        }
    }

    private async collectCoverage(processes: TestRunnerProcess[], testRun: TestRun) {
        for (const process of processes) {
            const coverageData = await process.readCoverage();
            for (const data of coverageData) {
                testRun.addCoverage(new FileCoverageAdapter(data));
            }
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

    private createProcesses(
        runner: TestRunner,
        builder: ProcessBuilder,
        include: readonly TestItem[] | undefined,
        coverage: CoverageFiles | undefined,
    ) {
        const withCoverage = (configured: ProcessBuilder, index: number) =>
            coverage ? configured.withCoverageClover(coverage.allocate(index)) : configured;

        if (!include) {
            return [runner.run(withCoverage(builder, 0))];
        }

        return include
            .map((testItem) => this.testCollection.getTestDefinition(testItem))
            .filter((testDef): testDef is TestDefinition => testDef !== undefined)
            .map((testDef, index) => withCoverage(this.withFilter(builder, testDef), index))
            .map((configured) => runner.run(configured));
    }

    private withFilter(builder: ProcessBuilder, testDefinition: TestDefinition): ProcessBuilder {
        const filter = FilterStrategyFactory.create(testDefinition).getFilter();
        return builder.clone().setArguments(filter);
    }
}
