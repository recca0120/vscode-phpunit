import { TestItem, TestRun, TestRunRequest } from 'vscode';
import { MessageObserver, OutputChannelObserver, TestResultObserver } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';

export class TestRunnerFactory {
    constructor(
        private outputChannelObserver: OutputChannelObserver,
        private messageObserver: MessageObserver,
    ) {}

    create(queue: Map<TestCase, TestItem>, testRun: TestRun, request: TestRunRequest): TestRunner {
        this.outputChannelObserver.setRequest(request);

        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(this.outputChannelObserver);
        runner.observe(this.messageObserver);

        return runner;
    }
}
