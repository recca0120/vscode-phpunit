import { OutputChannel, TestRunRequest } from 'vscode';
import {
    EOL,
    IConfiguration,
    TestConfiguration,
    TestExtraResultEvent,
    TestProcesses,
    TestResult,
    TestResultEvent,
    TestResultKind,
    TestResultSummary,
    TestRunnerObserver,
    TestRuntime,
    TestVersion,
    TimeAndMemory,
} from '../phpunit';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
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

        this.store[this.current] += `${text}\r\n`;
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

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
        private request: TestRunRequest,
    ) {
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

    testProcesses(result: TestProcesses) {
        this.outputChannel.appendLine(`${result.text}`);
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
        this.printPrintedOutput(result);
    }

    testFailed(result: TestResult): void {
        this.printTestResult(result);
        this.printErrorMessage(result);
        this.printPrintedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestResult): void {
        this.printTestResult(result);
        this.printPrintedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testResultSummary(result: TestResultSummary) {
        this.printedOutput.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);
    }

    timeAndMemory(result: TimeAndMemory) {
        this.printedOutput.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);
    }

    close() {
        this.printPrintedOutput();
        this.printedOutput.clear();
    }

    private printPrintedOutput(result: TestResult | null = null) {
        let text: string | undefined;
        if (!result) {
            text = this.printedOutput.all();
        } else {
            let matched: RegExpMatchArray | null = null;
            if (result.message) {
                matched = result.message.match(/This\stest\sprinted\soutput:(.*)/);
            }

            text = !matched ? this.printedOutput.get(result.name) : matched[1].trim();
        }

        if (text) {
            this.outputChannel.appendLine(`🟨 ${text}`);
            this.outputChannel.show(false);
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
            ].join('') + EOL,
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

        if (
            this.request.continuous === false &&
            showAfterExecution !== ShowOutputState.never &&
            state === showAfterExecution
        ) {
            this.outputChannel.show(false);
        }
    }

    private isClearOutputOnRun() {
        return this.configuration.get('clearOutputOnRun') === true;
    }
}
