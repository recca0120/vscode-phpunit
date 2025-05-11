import { OutputChannel, TestRunRequest } from 'vscode';
import {
    Builder, IConfiguration, TestConfiguration, TestDuration, TestFailed, TestFinished, TestIgnored, TestProcesses,
    TestResult, TestResultSummary, TestRunnerObserver, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted,
    TestVersion,
} from '../PHPUnit';
import { Printer } from './Printers';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class OutputChannelObserver implements TestRunnerObserver {
    private lastCommand = '';

    constructor(private outputChannel: OutputChannel, private configuration: IConfiguration, private printer: Printer, private request: TestRunRequest) {}

    run(builder: Builder): void {
        this.clearOutputOnRun();
        this.showOutputChannel(ShowOutputState.always);

        this.printer.start();
        this.appendLine(this.lastCommand = builder.toString());
    }

    error(error: string): void {
        this.outputChannel.clear();
        this.appendLine(this.lastCommand);
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
        const id = result.id;
        if (!id || id.match(/::/)) {
            return;
        }

        this.appendLine(this.printer.testSuiteStarted(result));
    }

    testStarted(result: TestStarted): void {
        this.appendLine(this.printer.testStarted(result));
    }

    testFinished(result: TestFinished): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
    }

    testFailed(result: TestFailed): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestIgnored): void {
        this.appendLine(this.printer.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        const id = result.id;
        if (!id || id.match(/::/)) {
            return;
        }

        this.appendLine(this.printer.testSuiteFinished(result));
    }

    testResultSummary(result: TestResultSummary) {
        this.appendLine(this.printer.end());
        this.append(this.printer.testResultSummary(result));
    }

    testDuration(result: TestDuration) {
        this.appendLine(this.printer.end());
        this.append(this.printer.timeAndMemory(result));
    }

    close() {
        this.appendLine(this.printer.end());
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

    private append(text: string | undefined) {
        if (text !== undefined) {
            this.outputChannel.append(text);
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
