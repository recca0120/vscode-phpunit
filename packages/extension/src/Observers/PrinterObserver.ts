import type {
    OutputLocation,
    OutputWriter,
    Printer,
    TestConfiguration,
    TestDuration,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestProcesses,
    TestResult,
    TestResultIdentify,
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
        this.printer.appendOutput(line);
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
        this.append(this.printer.testStarted(result), this.toLocation(result), result.id);
    }

    testFinished(result: TestFinished): void {
        this.append(this.printer.testFinished(result), this.toLocation(result), result.id);
        this.flushOutput(result);
    }

    testFailed(result: TestFailed): void {
        this.testFinished(result);
    }

    testIgnored(result: TestIgnored): void {
        this.append(this.printer.testIgnored(result), this.toLocation(result), result.id);
        this.flushOutput(result);
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
        this.flushOutput();
    }

    private flushOutput(result?: TestResult): void {
        const output = this.printer.flushOutput(result);
        if (!output) {
            return;
        }

        const testId = result && 'id' in result ? result.id : undefined;
        const location =
            result && 'file' in result
                ? this.toLocation(
                      result as TestResultIdentify & { details?: TestFailed['details'] },
                  )
                : undefined;
        this.append(output, location, testId);
    }

    private toLocation(
        result: TestResultIdentify & { details?: TestFailed['details'] },
    ): OutputLocation | undefined {
        if (!result.file) {
            return undefined;
        }

        const detail = result.details?.find(({ file }) => file === result.file);

        return { file: result.file, line: detail?.line ?? 1 };
    }

    private append(text: string | undefined, location?: OutputLocation, testId?: string) {
        if (text !== undefined) {
            this.writer.append(text, location, testId);
        }
    }
}
