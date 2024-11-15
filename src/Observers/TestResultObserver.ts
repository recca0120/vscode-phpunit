import { CancellationToken, Location, Position, Range, TestItem, TestMessage, TestRun } from 'vscode';
import { EOL, TestResult, TestRunnerObserver } from '../PHPUnit';

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: { testItem: TestItem }[] = [],
        private testRun: TestRun,
        private cancellation: CancellationToken,
    ) {
    }

    line(line: string): void {
        this.testRun.appendOutput(`${line}${EOL}`);
    }

    error(error: string): void {
        this.testRun.appendOutput(error);
    }

    close(): void {
        this.testRun.end();
    }

    testSuiteStarted(result: TestResult): void {
        this.testStarted(result);
    }

    testSuiteFinished(result: TestResult): void {
        this.testFinished(result);
    }

    testStarted(result: TestResult): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestResult): void {
        this.doRun(result, (test) => this.testRun.passed(test));
    }

    testFailed(result: TestResult): void {
        this.doRun(result, (test) =>
            this.testRun.failed(test, this.message(result, test), result.duration),
        );
    }

    testIgnored(result: TestResult): void {
        this.doRun(result, (test) => this.testRun.skipped(test));
    }

    private message(result: TestResult, test: TestItem) {
        const message = TestMessage.diff(result.message, result.expected!, result.actual!);
        const details = result.details;
        if (details.length > 0) {
            const current = details.find(({ file }) => result.file === file)!;
            const line = current ? current.line - 1 : test.range!.start.line;

            message.location = new Location(
                test.uri!,
                new Range(new Position(line, 0), new Position(line, 0)),
            );
        }
        return message;
    }

    private doRun(result: TestResult, fn: (test: TestItem) => void) {
        const test = this.find(result);
        if (!test) {
            return;
        }

        if (this.cancellation.isCancellationRequested) {
            this.testRun.skipped(test);
            return;
        }

        fn(test);
    }

    private find(result: TestResult) {
        return this.queue.find(({ testItem }) => testItem.id === result.testId)?.testItem;
    }
}
