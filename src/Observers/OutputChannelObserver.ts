import { inject, injectable } from 'inversify';
import type { OutputChannel, TestRunRequest } from 'vscode';
import { Configuration } from '../Configuration';
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
import { TYPES } from '../types';
import { OutputFormatter } from './Printers';

enum ShowOutputState {
    always = 'always',
    onFailure = 'onFailure',
    never = 'never',
}

@injectable()
export class OutputChannelObserver implements TestRunnerObserver {
    private lastCommand = '';
    private hasClearedCurrentRequest = false;
    private request!: TestRunRequest;

    constructor(
        @inject(TYPES.OutputChannel) private outputChannel: OutputChannel,
        @inject(Configuration) private configuration: IConfiguration,
        @inject(OutputFormatter) private outputFormatter: OutputFormatter,
    ) {}

    setRequest(request: TestRunRequest) {
        this.request = request;
        this.hasClearedCurrentRequest = false;
    }

    run(builder: ProcessBuilder): void {
        this.clearOutputOnRun();
        this.showOutputChannel(ShowOutputState.always);

        this.outputFormatter.start();
        this.appendLine((this.lastCommand = builder.toString()));
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
        const id = result.id;
        if (!id || id.match(/::/)) {
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
        this.appendLine(this.outputFormatter.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testIgnored(result: TestIgnored): void {
        this.appendLine(this.outputFormatter.testFinished(result));
        this.printedOutput(result);
        this.showOutputChannel(ShowOutputState.onFailure);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        const id = result.id;
        if (!id || id.match(/::/)) {
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
            this.request.continuous === false &&
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
