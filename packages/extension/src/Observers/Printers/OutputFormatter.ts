import {
    EOL,
    type PHPUnitXML,
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestProcesses,
    type TestResult,
    type TestResultSummary,
    type TestRuntime,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
    type TestVersion,
} from '@vscode-phpunit/phpunit';
import stripAnsi from 'strip-ansi';
import { OutputBuffer } from './OutputBuffer';

const PRINTED_OUTPUT_PATTERN =
    /(This test printed output|Test code or tested code printed unexpected output):(?<output>.*)/i;

export abstract class OutputFormatter {
    protected outputBuffer = new OutputBuffer();
    protected messages = new Map<TeamcityEvent, [icon: string, label: string]>([
        [TeamcityEvent.testVersion, ['🚀', 'STARTED']],
        [TeamcityEvent.testFinished, ['✅', 'PASSED']],
        [TeamcityEvent.testFailed, ['❌', 'FAILED']],
        [TeamcityEvent.testIgnored, ['➖', 'IGNORED']],
    ]);

    constructor(protected phpUnitXML: PHPUnitXML) {}

    static fileFormat(file: string, line: number) {
        return `${file}:${line}`;
    }

    start() {
        this.outputBuffer.clear();
    }

    error(text: string) {
        const [icon] = this.getMessage(TeamcityEvent.testFailed);

        return `${EOL}${icon} ${text}`;
    }

    testVersion(result: TestVersion) {
        const [icon] = this.getMessage(TeamcityEvent.testVersion);

        return `${EOL}${icon} ${result.text}${EOL}`;
    }

    testProcesses(result: TestProcesses) {
        return result.text;
    }

    testRuntime(result: TestRuntime) {
        return result.text;
    }

    testConfiguration(result: TestConfiguration) {
        return result.text + EOL;
    }

    testSuiteStarted(result: TestSuiteStarted): string | undefined {
        return result.id;
    }

    testStarted(result: TestStarted): string | undefined {
        this.outputBuffer.setCurrent(result.name);

        return undefined;
    }

    abstract testFinished(result: TestFinished | TestFailed): string | undefined;

    testIgnored(result: TestIgnored): string | undefined {
        const [icon] = this.getMessage(result.event);
        if (!icon) {
            return '';
        }
        const name = this.formatTestName(result);

        return `  ${icon} ${name} ➜ ${result.message} ${result.duration} ms`;
    }

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return undefined;
    }

    timeAndMemory(result: TestDuration) {
        return this.resetCurrentAndTrim(result.text);
    }

    testResultSummary(result: TestResultSummary) {
        return this.resetCurrentAndTrim(result.text);
    }

    end(): string | undefined {
        return undefined;
    }

    close() {}

    printedOutput(result?: TestResult) {
        const text = result ? this.getTestPrintedOutput(result) : this.outputBuffer.flush();

        return text ? `🟨 ${text}` : undefined;
    }

    private getTestPrintedOutput(result: TestResult): string | undefined {
        const name = 'name' in result ? result.name : '';
        const message = 'message' in result ? (result as { message: string }).message : '';
        const matched = message.match(PRINTED_OUTPUT_PATTERN);

        return matched ? matched.groups?.output.trim() : this.outputBuffer.get(name);
    }

    append(line: string) {
        this.outputBuffer.append(stripAnsi(line));
    }

    protected getMessage(event: TeamcityEvent): [string, string] | [] {
        return this.messages.get(event) ?? [];
    }

    protected formatTestResult(result: TestFinished | TestFailed) {
        const [icon] = this.getMessage(result.event);
        if (!icon) {
            return '';
        }
        const name = this.formatTestName(result);

        return `  ${icon} ${name} ${result.duration} ms`;
    }

    protected formatTestName(result: TestFinished | TestFailed | TestIgnored): string {
        return /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;
    }

    private resetCurrentAndTrim(text: string) {
        this.outputBuffer.setCurrent(undefined);

        return text.trim();
    }
}
