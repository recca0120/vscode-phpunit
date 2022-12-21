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
    TestExtraResultEvent,
    TestResult,
    TestResultEvent,
    TestResultKind,
    TestResultSummary,
    TestRuntime,
    TestVersion,
    TimeAndMemory,
} from './phpunit/problem-matcher';
import { IConfiguration } from './phpunit/configuration';

export const EOL = '\r\n';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: { test: TestItem }[] = [],
        private testRun: TestRun,
        private cancellation: CancellationToken
    ) {}

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
            this.testRun.failed(test, this.message(result, test), result.duration)
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
                new Range(new Position(line, 0), new Position(line, 0))
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
        return this.queue.find(({ test }) => test.id === result.testId)?.test;
    }
}

class PrintedOutput {
    private current?: string;

    private store: { [p: string]: string } = {};

    setCurrent(current?: string) {
        this.current = current;
    }

    append(text: string) {
        if (!this.current || text.match(/^##teamcity\[/)) {
            return;
        }

        if (!this.store[this.current]) {
            this.store[this.current] = '';
        }

        this.store[this.current] += text;
    }

    get(name: string) {
        if (!this.store[name]) {
            return;
        }

        const text = this.store[name];
        delete this.store[name];
        this.setCurrent(undefined);

        return text.trim();
    }

    all() {
        const text = [];
        for (const name in this.store) {
            text.push(this.get(name));
        }

        return text.join('\n').trim();
    }

    clear() {
        this.store = {};
    }
}

export class OutputChannelObserver implements TestRunnerObserver {
    private testResultMessages = new Map<TestResultKind, string[]>([
        [TestExtraResultEvent.testVersion, ['🚀', 'STARTED']],
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
    private printedOutput: PrintedOutput;

    constructor(private outputChannel: OutputChannel, private configuration: IConfiguration) {
        this.printedOutput = new PrintedOutput();
    }

    run(command: string): void {
        if (this.isClearOutputOnRun()) {
            this.outputChannel.clear();
        }

        this.showOutputChannel(ShowOutputState.always);

        this.latestInput = command;
        this.outputChannel.appendLine(command);
        this.outputChannel.appendLine('');
    }

    error(error: string): void {
        const [icon] = this.testResultMessages.get(TestResultEvent.testFailed)!;
        this.outputChannel.clear();
        this.outputChannel.appendLine(this.latestInput);
        this.outputChannel.appendLine('');
        this.outputChannel.append(`${icon} ${error}`);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    line(line: string): void {
        this.printedOutput.append(line);
    }

    testVersion(result: TestVersion) {
        const [icon] = this.testResultMessages.get(result.kind)!;
        this.outputChannel.appendLine(`${icon} ${result.text}`);
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

    testStarted(result: TestResult): void {
        this.printedOutput.setCurrent(result.name);
    }

    testFinished(result: TestResult): void {
        this.printTestResult(result);
        this.printPrintedOutput(result.name);
    }

    testFailed(result: TestResult): void {
        this.printTestResult(result);
        this.printErrorMessage(result);
        this.printPrintedOutput(result.name);
    }

    testIgnored(result: TestResult): void {
        this.printTestResult(result);
        this.printPrintedOutput(result.name);
    }

    testResultSummary(result: TestResultSummary) {
        this.printedOutput.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);

        if (
            result.failures ||
            result.errors ||
            result.skipped ||
            result.incomplete ||
            result.risky
        ) {
            this.showOutputChannel(ShowOutputState.onFailure);
        }
    }

    timeAndMemory(result: TimeAndMemory) {
        this.printedOutput.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);
    }

    close() {
        this.printPrintedOutput();
        this.printedOutput.clear();
    }

    private printPrintedOutput(name: string | null = null) {
        const text = name ? this.printedOutput.get(name) : this.printedOutput.all();
        if (text) {
            this.outputChannel.appendLine(text.trim());
            this.outputChannel.show();
        }
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
        const [icon] = this.testResultMessages.get(result.kind)!;
        const name = /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;

        this.outputChannel.appendLine(`  ${icon} ${name} ${result.duration} ms`);
    }

    private showOutputChannel(state: ShowOutputState) {
        const showAfterExecution =
            (this.configuration.get('showAfterExecution') as ShowOutputState) ??
            ShowOutputState.onFailure;

        if (showAfterExecution !== ShowOutputState.never && state === showAfterExecution) {
            this.outputChannel.show();
        }
    }

    private isClearOutputOnRun() {
        return this.configuration.get('clearOutputOnRun') === true;
    }
}
