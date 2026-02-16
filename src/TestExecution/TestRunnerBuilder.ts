import { inject, injectable } from 'inversify';
import type { TestItem, TestRun, TestRunRequest } from 'vscode';
import { TestRunnerObserverFactory } from '../Observers';
import { TestRunner } from '../PHPUnit';
import type { TestDefinition } from '../PHPUnit';

@injectable()
export class TestRunnerBuilder {
    constructor(
        @inject(TestRunnerObserverFactory) private observerFactory: TestRunnerObserverFactory,
    ) {}

    build(queue: Map<TestDefinition, TestItem>, testRun: TestRun, request: TestRunRequest): TestRunner {
        const runner = new TestRunner();
        for (const observer of this.observerFactory.create(queue, testRun, request)) {
            runner.observe(observer);
        }

        return runner;
    }
}
