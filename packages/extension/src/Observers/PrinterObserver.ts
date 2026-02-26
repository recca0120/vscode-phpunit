import type {
    OutputWriter,
    Printer,
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

export class PrinterObserver implements TestRunnerObserver {
    constructor(
        private writer: OutputWriter,
        private printer: Printer,
    ) {}

    error(error: string): void {
        this.append(this.printer.error(error));
    }

    line(line: string): void {
        this.printer.appendBuffer(line);
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
    }

    testIgnored(result: TestIgnored): void {
        this.append(this.printer.testIgnored(result));
        this.printedOutput(result);
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
        }
    }

    private append(text: string | undefined) {
        if (text !== undefined) {
            this.writer.append(text);
        }
    }
}
