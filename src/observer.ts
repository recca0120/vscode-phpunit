import { TestRunnerObserver } from './phpunit/test-runner';
import {
    CancellationToken,
    Location,
    OutputChannel,
    Position,
    Range,
    TestItem,
    TestMessage,
    TestRun,
} from 'vscode';
import { TestResult } from './phpunit/problem-matcher';

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: { test: TestItem }[] = [],
        private run: TestRun,
        private cancellation: CancellationToken
    ) {}

    close(): void {
        this.run.end();
    }

    testSuiteStarted(result: TestResult): void {
        this.testStarted(result);
    }

    testSuiteFinished(result: TestResult): void {
        this.testFinished(result);
    }

    testStarted(result: TestResult): void {
        this.doRun('started', result, (test) => this.run.started(test));
    }

    testFinished(result: TestResult): void {
        this.doRun('finished', result, (test) => this.run.passed(test));
    }

    testFailed(result: TestResult): void {
        this.doRun('finished', result, (test) =>
            this.run.failed(test, this.message(result, test), result.duration)
        );
    }

    testIgnored(result: TestResult): void {
        this.doRun('finished', result, (test) => this.run.skipped(test));
    }

    private message(result: TestResult, test: TestItem) {
        const message = TestMessage.diff(result.message, result.expected!, result.actual!);
        const details = result.details;
        if (details.length > 0) {
            const current = details.find(({ file }) => result.file === file)!;
            const line = current ? current.line - 1 : test.range!.start.line;

            message.location = new Location(
                test.uri!,
                new Range(new Position(line, 0), new Position(line, 0))
            );
        }
        return message;
    }

    private doRun(type: 'started' | 'finished', result: TestResult, fn: (test: TestItem) => void) {
        const test = this.find(result);
        if (!test) {
            return;
        }

        if (this.cancellation.isCancellationRequested) {
            this.run.skipped(test);
            return;
        }

        if (type === 'started') {
            this.run.appendOutput(`Running ${result.id}\r\n`);
        }

        fn(test);

        if (type === 'finished') {
            this.run.appendOutput(`Completed ${result.id}\r\n`);
        }
    }

    private find(result: TestResult) {
        return this.queue.find(({ test }) => test.id === result.testId)?.test;
    }
}

export class OutputChannelObserver implements TestRunnerObserver {
    constructor(private outputChannel: OutputChannel) {}

    input(input: string): void {
        this.outputChannel.appendLine(input);
        this.outputChannel.appendLine('');
    }

    line(line: string): void {
        this.outputChannel.appendLine(line);
    }

    error(output: string): void {
        this.outputChannel.append(output);
    }
}
