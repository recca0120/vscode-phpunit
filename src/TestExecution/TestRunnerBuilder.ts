import { inject, injectable } from 'inversify';
import type { TestItem, TestRun, TestRunRequest } from 'vscode';
import { ErrorDialogObserver, OutputChannelObserver, TestResultObserver } from '../Observers';
import { TestRunner } from '../PHPUnit';
import type { TestCase } from '../TestCollection';

@injectable()
export class TestRunnerBuilder {
    constructor(
        @inject(OutputChannelObserver) private outputChannelObserver: OutputChannelObserver,
        @inject(ErrorDialogObserver) private errorDialogObserver: ErrorDialogObserver,
    ) {}

    build(queue: Map<TestCase, TestItem>, testRun: TestRun, request: TestRunRequest): TestRunner {
        this.outputChannelObserver.setRequest(request);

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(this.outputChannelObserver);
        runner.observe(this.errorDialogObserver);

        return runner;
    }
}
