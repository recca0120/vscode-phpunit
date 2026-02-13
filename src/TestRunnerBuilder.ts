import { TestItem, TestRun, TestRunRequest } from 'vscode';
import { ErrorDialogObserver, OutputChannelObserver, TestResultObserver } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';

export class TestRunnerBuilder {
    constructor(
        private outputChannelObserver: OutputChannelObserver,
        private errorDialogObserver: ErrorDialogObserver,
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
