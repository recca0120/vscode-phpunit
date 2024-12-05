import { OutputChannel, TestRunRequest } from 'vscode';
import {
    IConfiguration,
    TestConfiguration,
    TestProcesses,
    TestResult,
    TestResultSummary,
    TestRunnerObserver,
    TestRuntime,
    TestVersion,
    TimeAndMemory,
} from '../PHPUnit';
import { PrettyPrinter, Printer } from '../Printers';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

class OutputBuffer {
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
    private lastInput = '';
    private outputBuffer: OutputBuffer = new OutputBuffer();

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
        private request: TestRunRequest,
        private printer: Printer = new PrettyPrinter(),
    ) {}

    run(command: string): void {
        if (this.isClearOutputOnRun()) {
            this.outputChannel.clear();
        }

        this.showOutputChannel(ShowOutputState.always);

        this.lastInput = command;
        this.outputChannel.appendLine(command);
        this.outputChannel.appendLine('');
    }

    error(error: string): void {
        this.outputChannel.clear();
        this.outputChannel.appendLine(this.lastInput);
        this.outputChannel.appendLine('');
        this.outputChannel.append(this.printer.error(error));
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    line(line: string): void {
        this.outputBuffer.append(line);
    }

    testVersion(result: TestVersion) {
        this.outputChannel.appendLine(this.printer.version(result));
        this.outputChannel.appendLine('');
    }

    testProcesses(result: TestProcesses) {
        this.outputChannel.appendLine(result.text);
    }

    testRuntime(result: TestRuntime) {
        this.outputChannel.appendLine(result.text);
    }

    testConfiguration(result: TestConfiguration) {
        this.outputChannel.appendLine(result.text);
        this.outputChannel.appendLine('');
    }

    testSuiteStarted(result: TestResult): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.outputChannel.appendLine(this.printer.suiteStarted(result));
    }

    testSuiteFinished(result: TestResult): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.outputChannel.appendLine(this.printer.suiteFinished(result));
    }

    testStarted(result: TestResult): void {
        this.outputBuffer.setCurrent(result.name);
        const output = this.printer.testStarted(result);
        if (output) {
            this.outputChannel.appendLine(output);
        }
    }

    testFinished(result: TestResult): void {
        this.outputChannel.appendLine(this.printer.testFinished(result));
        this.printPrintedOutput(result);
    }

    testFailed(result: TestResult): void {
        this.outputChannel.appendLine(this.printer.testFinished(result));
        this.printPrintedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestResult): void {
        this.outputChannel.appendLine(this.printer.testFinished(result));
        this.printPrintedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testResultSummary(result: TestResultSummary) {
        this.outputBuffer.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);
    }

    timeAndMemory(result: TimeAndMemory) {
        this.outputBuffer.setCurrent(undefined);
        this.outputChannel.appendLine(result.text);
    }

    close() {
        this.printPrintedOutput();
        this.outputBuffer.clear();
    }

    private printPrintedOutput(result: TestResult | null = null) {
        let text: string | undefined;
        if (!result) {
            text = this.outputBuffer.all();
        } else {
            let matched: RegExpMatchArray | null = null;
            if (result.message) {
                matched = result.message.match(/This\stest\sprinted\soutput:(.*)/);
            }

            text = !matched ? this.outputBuffer.get(result.name) : matched[1].trim();
        }

        if (text) {
            this.outputChannel.appendLine(`🟨 ${text}`);
            this.outputChannel.show(false);
        }
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
            this.outputChannel.show(true);
        }
    }

    private isClearOutputOnRun() {
        return this.configuration.get('clearOutputOnRun') === true;
    }
}
