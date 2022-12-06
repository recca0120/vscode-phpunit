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
import {
    TestConfiguration,
    TestResult,
    TestResultEvent,
    TestResultSummary,
    TestRuntime,
    TestVersion,
    TimeAndMemory,
} from './phpunit/problem-matcher';

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
    private testResultMessages = new Map<TestResultEvent, string[]>([
        [TestResultEvent.testFinished, ['✅', 'PASSED']],
        [TestResultEvent.testFailed, ['❌', 'FAILED']],
        [TestResultEvent.testIgnored, ['➖', 'IGNORED']],
    ]);
    private decorated = {
        default: '│',
        start: '┐',
        message: '├',
        diff: '┊',
        trace: '╵',
        last: '┴',
    };

    constructor(private outputChannel: OutputChannel) {}

    input(input: string): void {
        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine(input);
        this.outputChannel.appendLine('');
    }

    // line(line: string): void {
    //     this.outputChannel.appendLine(line);
    // }

    error(error: string): void {
        const [icon] = this.testResultMessages.get(TestResultEvent.testFailed)!;
        this.outputChannel.clear();
        this.outputChannel.append(`${icon} ${error}`);
    }

    testVersion(result: TestVersion) {
        this.outputChannel.appendLine(`${result.text}`);
        this.outputChannel.appendLine('');
    }

    testRuntime(result: TestRuntime) {
        this.outputChannel.appendLine(`${result.text}`);
    }

    testConfiguration(result: TestConfiguration) {
        this.outputChannel.appendLine(`${result.text}`);
        this.outputChannel.appendLine('');
    }

    testSuiteStarted(result: TestResult): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.outputChannel.appendLine(`${result.id}`);
    }

    testSuiteFinished(result: TestResult): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.outputChannel.appendLine('');
    }

    testFinished(result: TestResult): void {
        this.printTestResult(result);
    }

    testFailed(result: TestResult): void {
        this.printTestResult(result);
        this.printErrorMessage(result);
    }

    private printErrorMessage(result: TestResult) {
        this.printMessage(this.decorated.start);
        this.printMessage(this.decorated.message, result.message);
        this.printDiffMessage(result);

        this.printMessage(this.decorated.default);
        result.details.forEach(({ file, line }) =>
            this.printMessage(this.decorated.default, `${file}:${line}`)
        );
        this.printMessage(this.decorated.last);
        this.outputChannel.appendLine('');
    }

    private printDiffMessage(result: TestResult) {
        if (!(result.expected && result.actual)) {
            return;
        }

        this.printMessage(this.decorated.diff, `${result.expected}`, '---·Expected ');
        this.printMessage(this.decorated.diff, `${result.actual}`, '+++·Actual ');
    }

    testIgnored(result: TestResult): void {
        this.printTestResult(result);
    }

    testResultSummary(result: TestResultSummary) {
        this.outputChannel.appendLine(result.text);
    }

    timeAndMemory(result: TimeAndMemory) {
        this.outputChannel.appendLine(result.text);
    }

    private printMessage(decorated: string, message: string = '', prefix = '') {
        const indent = '     ';
        message.split(/\r\n|\n/g).forEach((message, index) => {
            this.outputChannel.append(indent);
            this.outputChannel.append(decorated);
            this.outputChannel.append(' ');
            this.outputChannel.appendLine(`${index === 0 ? prefix : ''}${message}`);
        });
    }

    private printTestResult(result: TestResult) {
        const [icon] = this.testResultMessages.get(result.event)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;
        this.outputChannel.append('  ');
        this.outputChannel.append(`${icon} ${name} ${result.duration} ms`);
        this.outputChannel.appendLine('');
    }
}
