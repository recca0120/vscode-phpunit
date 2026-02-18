import {
    EOL,
    type PHPUnitXML,
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestFailed,
    type TestFinished,
    type TestProcesses,
    type TestResult,
    type TestResultSummary,
    type TestRuntime,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
    type TestVersion,
} from '../../PHPUnit';
import { OutputBuffer } from './OutputBuffer';

const PRINTED_OUTPUT_PATTERN =
    /(This test printed output|Test code or tested code printed unexpected output):(?<output>.*)/i;

export abstract class OutputFormatter {
    protected outputBuffer = new OutputBuffer();
    protected messages = new Map<TeamcityEvent, string[]>([
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
        this.setCurrent(result.name);

        return undefined;
    }

    abstract testFinished(result: TestFinished | TestFailed): string | undefined;

    testSuiteFinished(_result: TestSuiteFinished): string | undefined {
        return undefined;
    }

    timeAndMemory(result: TestDuration) {
        return this.clearAndReturn(result.text);
    }

    testResultSummary(result: TestResultSummary) {
        return this.clearAndReturn(result.text);
    }

    end(): string | undefined {
        return undefined;
    }

    close() {}

    printedOutput(result: TestResult | undefined = undefined) {
        const icon = '🟨';
        if (!result) {
            const text = this.outputBuffer.all();

            return text ? `${icon} ${text}` : undefined;
        }

        const name = 'name' in result ? result.name : '';
        const message = 'message' in result ? result.message : '';

        const matched = message.match(PRINTED_OUTPUT_PATTERN);
        const text = matched ? matched.groups?.output.trim() : this.outputBuffer.get(name);

        return text ? `${icon} ${text}` : undefined;
    }

    append(line: string) {
        this.outputBuffer.append(line);
    }

    protected getMessage(event: TeamcityEvent): string[] {
        return this.messages.get(event) ?? [];
    }

    protected formatTestName(result: TestFinished | TestFailed): string {
        return /::/.test(result.id) ? result.name.replace(/^test_/, '') : result.id;
    }

    private clearAndReturn(text: string) {
        this.setCurrent(undefined);

        return text.trim();
    }

    private setCurrent(current?: string) {
        this.outputBuffer.setCurrent(current);
    }
}
