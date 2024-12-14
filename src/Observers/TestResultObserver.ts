import {
    CancellationToken,
    Location,
    Position,
    Range,
    TestItem,
    TestMessage,
    TestMessageStackFrame,
    TestRun,
} from 'vscode';
import { URI } from 'vscode-uri';
import {
    EOL,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestResult,
    TestRunnerObserver,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
} from '../PHPUnit';

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: { test: TestItem }[] = [],
        private testRun: TestRun,
        private cancellation?: CancellationToken,
    ) { }

    line(line: string): void {
        this.testRun.appendOutput(`${line}${EOL}`);
    }

    error(error: string): void {
        this.testRun.appendOutput(error);
    }

    close(): void {
        // Do not call testRun.end() as this would prevent other test runners from reporting test results.
        // this.testRun.end();
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testStarted(result: TestStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test));
    }

    testFailed(result: TestFailed): void {
        this.doRun(result, (test) =>
            this.testRun.failed(test, this.message(result, test), result.duration),
        );
    }

    testIgnored(result: TestIgnored): void {
        this.doRun(result, (test) => this.testRun.skipped(test));
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test));
    }

    private message(result: TestFailed | TestIgnored, test: TestItem) {
        const message = TestMessage.diff(result.message, result.expected!, result.actual!);
        const details = result.details;
        if (details.length > 0) {
            const current = details.find(({ file }) => file.endsWith(result.file ?? ''))!;
            const line = current ? current.line - 1 : test.range!.start.line;

            message.location = new Location(
                test.uri!,
                new Range(new Position(line, 0), new Position(line, 0)),
            );

            message.stackTrace = details
                .filter(({ file, line }) => {
                    return file.endsWith(result.file ?? '') && line !== current.line;
                })
                .map(({ file, line }) => {
                    return new TestMessageStackFrame(`${file}:${line}`, URI.file(file), new Position(line, 0));
                });
        }

        return message;
    }

    private doRun(result: TestResult, callback: (test: TestItem) => void) {
        const test = this.find(result);
        if (!test) {
            return;
        }

        if (this.cancellation?.isCancellationRequested) {
            this.testRun.skipped(test);
            return;
        }

        callback(test);
    }

    private find(result: TestResult) {
        return 'testId' in result
            ? this.queue.find(({ test }) => test.id === result.testId)?.test
            : undefined;
    }
}