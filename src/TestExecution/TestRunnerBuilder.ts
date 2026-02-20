import { inject, injectable } from 'inversify';
import type { TestItem, TestRun, TestRunRequest } from 'vscode';
import { TestRunnerObserverFactory } from '../Observers';
import type { TestDefinition } from '../PHPUnit';
import { TestRunner } from '../PHPUnit';
import { CloverParser } from '../PHPUnit/TestCoverage';

@injectable()
export class TestRunnerBuilder {
    constructor(
        @inject(TestRunnerObserverFactory) private observerFactory: TestRunnerObserverFactory,
        @inject(CloverParser) private cloverParser: CloverParser,
    ) {}

    build(
        queue: Map<TestDefinition, TestItem>,
        testRun: TestRun,
        request: TestRunRequest,
    ): TestRunner {
        const runner = new TestRunner(this.cloverParser);
        for (const observer of this.observerFactory.create(queue, testRun, request)) {
            runner.observe(observer);
        }

        return runner;
    }
}
