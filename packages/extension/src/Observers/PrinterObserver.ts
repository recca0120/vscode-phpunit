import type {
    IConfiguration,
    Printer,
    ProcessBuilder,
    TestConfiguration,
    TestDuration,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestProcesses,
    TestResult,
    TestResultSummary,
    TestRunnerObserver,
    TestRuntime,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
    TestVersion,
} from '@vscode-phpunit/phpunit';
import type { TestRunRequest } from 'vscode';
import type { OutputWriter } from './OutputWriter';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class PrinterObserver implements TestRunnerObserver {
    private hasClearedCurrentRequest = false;

    constructor(
        private writer: OutputWriter,
        private configuration: IConfiguration,
        private printer: Printer,
        private request: TestRunRequest,
    ) {}

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.showOutputChannel(ShowOutputState.always);

        this.append(this.printer.start(builder.toString()));
    }

    error(error: string): void {
        this.writer.clear();
        this.append(this.printer.error(error));
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    line(line: string): void {
        this.printer.append(line);
    }

    testVersion(result: TestVersion) {
        this.append(this.printer.testVersion(result));
    }

    testProcesses(result: TestProcesses) {
        this.append(this.printer.testProcesses(result));
    }

    testRuntime(result: TestRuntime) {
        this.append(this.printer.testRuntime(result));
    }

    testConfiguration(result: TestConfiguration) {
        this.append(this.printer.testConfiguration(result));
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.append(this.printer.testSuiteStarted(result));
    }

    testStarted(result: TestStarted): void {
        this.append(this.printer.testStarted(result));
    }

    testFinished(result: TestFinished): void {
        this.append(this.printer.testFinished(result));
        this.printedOutput(result);
    }

    testFailed(result: TestFailed): void {
        this.testFinished(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestIgnored): void {
        this.append(this.printer.testIgnored(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.append(this.printer.testSuiteFinished(result));
    }

    testResultSummary(result: TestResultSummary) {
        this.append(this.printer.testResultSummary(result));
    }

    testDuration(result: TestDuration) {
        this.append(this.printer.timeAndMemory(result));
    }

    close() {
        this.append(this.printer.close());
        this.printedOutput();
    }

    private printedOutput(result?: TestResult): void {
        const output = this.printer.printedOutput(result);
        if (output) {
            this.append(output);
            this.writer.show(false);
        }
    }

    private append(text: string | undefined) {
        if (text !== undefined) {
            this.writer.append(text);
        }
    }

    private showOutputChannel(state: ShowOutputState) {
        const showAfterExecution =
            (this.configuration.get('showAfterExecution') as ShowOutputState) ??
            ShowOutputState.onFailure;

        if (!this.request.continuous && state === showAfterExecution) {
            this.writer.show(true);
        }
    }

    private clearOutputOnRun() {
        if (this.hasClearedCurrentRequest) {
            return;
        }

        if (this.configuration.get('clearOutputOnRun') === true) {
            this.writer.clear();
        }

        this.hasClearedCurrentRequest = true;
    }
}
