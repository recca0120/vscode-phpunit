import type { OutputChannel, TestRunRequest } from 'vscode';
import type {
    IConfiguration,
    ProcessBuilder,
    TestConfiguration,
    TestDuration,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestProcesses,
    TestResult,
    TestResultSummary,
    TestRunnerObserver,
    TestRuntime,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
    TestVersion,
} from '../PHPUnit';
import type { OutputFormatter } from './Printers';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

export class OutputChannelObserver implements TestRunnerObserver {
    private lastCommand = '';
    private hasClearedCurrentRequest = false;

    constructor(
        private outputChannel: OutputChannel,
        private configuration: IConfiguration,
        private outputFormatter: OutputFormatter,
        private request: TestRunRequest,
    ) {}

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.showOutputChannel(ShowOutputState.always);

        this.outputFormatter.start();
        this.lastCommand = builder.toString();
        this.appendLine(this.lastCommand);
    }

    error(error: string): void {
        this.outputChannel.clear();
        this.appendLine(this.lastCommand);
        this.appendLine(this.outputFormatter.error(error));
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    line(line: string): void {
        this.outputFormatter.append(line);
    }

    testVersion(result: TestVersion) {
        this.appendLine(this.outputFormatter.testVersion(result));
    }

    testProcesses(result: TestProcesses) {
        this.appendLine(this.outputFormatter.testProcesses(result));
    }

    testRuntime(result: TestRuntime) {
        this.appendLine(this.outputFormatter.testRuntime(result));
    }

    testConfiguration(result: TestConfiguration) {
        this.appendLine(this.outputFormatter.testConfiguration(result));
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        if (this.shouldSkipSuite(result.id)) {
            return;
        }

        this.appendLine(this.outputFormatter.testSuiteStarted(result));
    }

    testStarted(result: TestStarted): void {
        this.appendLine(this.outputFormatter.testStarted(result));
    }

    testFinished(result: TestFinished): void {
        this.appendLine(this.outputFormatter.testFinished(result));
        this.printedOutput(result);
    }

    testFailed(result: TestFailed): void {
        this.handleFaultedTest(result);
    }

    testIgnored(result: TestIgnored): void {
        this.handleFaultedTest(result);
    }

    private handleFaultedTest(result: TestFailed | TestIgnored): void {
        this.testFinished(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        if (this.shouldSkipSuite(result.id)) {
            return;
        }

        this.appendLine(this.outputFormatter.testSuiteFinished(result));
    }

    testResultSummary(result: TestResultSummary) {
        this.appendLine(this.outputFormatter.end());
        this.append(this.outputFormatter.testResultSummary(result));
    }

    testDuration(result: TestDuration) {
        this.appendLine(this.outputFormatter.end());
        this.append(this.outputFormatter.timeAndMemory(result));
    }

    close() {
        this.appendLine(this.outputFormatter.end());
        this.printedOutput();
        this.outputFormatter.close();
    }

    private shouldSkipSuite(id?: string): boolean {
        return !id || !!id.match(/::/);
    }

    private printedOutput(result: TestResult | undefined = undefined): void {
        const output = this.outputFormatter.printedOutput(result);
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
            !this.request.continuous &&
            showAfterExecution !== ShowOutputState.never &&
            state === showAfterExecution
        ) {
            this.outputChannel.show(true);
        }
    }

    private clearOutputOnRun() {
        if (this.hasClearedCurrentRequest) {
            return;
        }

        if (this.configuration.get('clearOutputOnRun') === true) {
            this.outputChannel.clear();
        }

        this.hasClearedCurrentRequest = true;
    }
}
