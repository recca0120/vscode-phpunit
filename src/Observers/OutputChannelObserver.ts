import { OutputChannel, TestRunRequest } from 'vscode';
import {
    IConfiguration,
    TestConfiguration,
    TestProcesses,
    TestResult,
    TestResultSummary,
    TestRunnerObserver,
    TestRuntime,
    TestSuiteFinished,
    TestSuiteStarted,
    TestVersion,
    TimeAndMemory,
} from '../PHPUnit';
import { PrettyPrinter, Printer } from './Printers';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class OutputChannelObserver implements TestRunnerObserver {
    private lastInput = '';

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
        private request: TestRunRequest,
        private printer: Printer = new PrettyPrinter(),
    ) {}

    run(command: string): void {
        this.clearOutputOnRun();
        this.showOutputChannel(ShowOutputState.always);

        this.printer.start();
        this.appendLine(this.lastInput = command);
    }

    error(error: string): void {
        this.outputChannel.clear();
        this.appendLine(this.lastInput);
        this.appendLine(this.printer.error(error));
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    line(line: string): void {
        this.printer.append(line);
    }

    testVersion(result: TestVersion) {
        this.appendLine(this.printer.testVersion(result));
    }

    testProcesses(result: TestProcesses) {
        this.appendLine(this.printer.testProcesses(result));
    }

    testRuntime(result: TestRuntime) {
        this.appendLine(this.printer.testRuntime(result));
    }

    testConfiguration(result: TestConfiguration) {
        this.appendLine(this.printer.testConfiguration(result));
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.appendLine(this.printer.testSuiteStarted(result));
    }

    testSuiteFinished(result: TestResult): void {
        if (!result.id || result.id.match(/::/)) {
            return;
        }

        this.appendLine(this.printer.testSuiteFinished(result));
    }

    testStarted(result: TestResult): void {
        this.appendLine(this.printer.testStarted(result));
    }

    testFinished(result: TestResult): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
    }

    testFailed(result: TestResult): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestResult): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    timeAndMemory(result: TimeAndMemory) {
        this.appendLine(this.printer.end());
        this.appendLine(this.printer.timeAndMemory(result));
    }

    testResultSummary(result: TestResultSummary) {
        this.appendLine(this.printer.testResultSummary(result));
    }

    close() {
        this.printedOutput();
        this.printer.close();
    }

    private printedOutput(result: TestResult | undefined = undefined): void {
        const output = this.printer.printedOutput(result);
        if (output) {
            this.appendLine(output);
            this.outputChannel.show(false);
        }
    }

    private appendLine(text: string | undefined) {
        if (text !== undefined) {
            this.outputChannel.appendLine(text);
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

    private clearOutputOnRun() {
        if (this.configuration.get('clearOutputOnRun') === true) {
            this.outputChannel.clear();
        }
    }
}
