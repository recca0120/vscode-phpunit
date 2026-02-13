import { OutputChannel, TestItem, TestRun, TestRunRequest } from 'vscode';
import { Configuration } from './Configuration';
import { MessageObserver, OutputChannelObserver, Printer, TestResultObserver } from './Observers';
import { TestRunner } from './PHPUnit';
import { TestCase } from './TestCollection';

export class TestRunnerFactory {
    constructor(
        private outputChannel: OutputChannel,
        private configuration: Configuration,
        private printer: Printer,
        private messageObserver: MessageObserver,
    ) {}

    create(queue: Map<TestCase, TestItem>, testRun: TestRun, request: TestRunRequest): TestRunner {
        const runner = new TestRunner();
        runner.observe(new TestResultObserver(queue, testRun));
        runner.observe(new OutputChannelObserver(this.outputChannel, this.configuration, this.printer, request));
        runner.observe(this.messageObserver);

        return runner;
    }
}
