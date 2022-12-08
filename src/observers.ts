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
import { IConfiguration } from './phpunit/configuration';

export const EOL = '\n';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: { test: TestItem }[] = [],
        private run: TestRun,
        private cancellation: CancellationToken
    ) {}

    line(line: string): void {
        this.run.appendOutput(`${line}${EOL}`);
    }

    error(error: string): void {
        this.run.appendOutput(error);
    }

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
            this.run.appendOutput(`Running ${result.id}${EOL}`);
        }

        fn(test);

        if (type === 'finished') {
            this.run.appendOutput(`Completed ${result.id}${EOL}`);
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

    private latestInput = '';

    constructor(private outputChannel: OutputChannel, private configuration: IConfiguration) {}

    input(input: string): void {
        this.outputChannel.clear();
        this.showOutput(ShowOutputState.always);

        this.latestInput = input;
        this.outputChannel.appendLine(input);
        this.outputChannel.appendLine('');
    }

    error(error: string): void {
        const [icon] = this.testResultMessages.get(TestResultEvent.testFailed)!;
        this.outputChannel.clear();
        this.outputChannel.appendLine(this.latestInput);
        this.outputChannel.appendLine('');
        this.outputChannel.append(`${icon} ${error}`);
        this.showOutput(ShowOutputState.onFailure);
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

    testIgnored(result: TestResult): void {
        this.printTestResult(result);
    }

    testResultSummary(result: TestResultSummary) {
        this.outputChannel.appendLine(result.text);

        if (
            result.failures ||
            result.errors ||
            result.skipped ||
            result.incomplete ||
            result.risky
        ) {
            this.showOutput(ShowOutputState.onFailure);
        }
    }

    timeAndMemory(result: TimeAndMemory) {
        this.outputChannel.appendLine(result.text);
    }

    private printErrorMessage(result: TestResult) {
        this.outputChannel.append(
            [
                this.printMessage(this.decorated.start),
                this.printMessage(this.decorated.message, result.message),
                this.printDiffMessage(result),

                this.printMessage(this.decorated.default),
                result.details.reduce((msg, { file, line }) => {
                    return (msg += this.printMessage(this.decorated.default, `${file}:${line}`));
                }, ''),
                this.printMessage(this.decorated.last),
            ].join('') + EOL
        );
    }

    private printDiffMessage(result: TestResult) {
        if (!(result.expected && result.actual)) {
            return;
        }

        return [
            this.printMessage(this.decorated.diff, `${result.expected}`, '---·Expected '),
            this.printMessage(this.decorated.diff, `${result.actual}`, '+++·Actual '),
        ].join('');
    }

    private printMessage(decorated: string, message: string = '', prefix = '') {
        const indent = '     ';

        return message.split(/\r\n|\n/g).reduce((msg, line, index) => {
            return (msg += `${indent}${decorated} ${index === 0 ? prefix : ''}${line}${EOL}`);
        }, '');
    }

    private printTestResult(result: TestResult) {
        const [icon] = this.testResultMessages.get(result.event)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        this.outputChannel.appendLine(`  ${icon} ${name} ${result.duration} ms`);
    }

    private showOutput(state: ShowOutputState) {
        const showAfterExecution =
            (this.configuration.get('showAfterExecution') as ShowOutputState) ??
            ShowOutputState.onFailure;

        if (showAfterExecution !== ShowOutputState.never && state === showAfterExecution) {
            this.outputChannel.show();
        }
    }
}
