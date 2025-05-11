import {
    EOL, PHPUnitXML, TeamcityEvent, TestConfiguration, TestDuration, TestFailed, TestFinished, TestProcesses,
    TestResult, TestResultSummary, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted, TestVersion,
} from '../../PHPUnit';

class OutputBuffer {
    private current?: string;
    private store: Map<string, string> = new Map();

    setCurrent(current?: string) {
        this.current = current;
    }

    append(text: string) {
        if (!this.current || text.match(/^##teamcity\[/)) {
            return;
        }

        const existing = this.store.get(this.current) || '';
        this.store.set(this.current, `${existing}${text}${EOL}`);
    }

    get(name: string) {
        const text = this.store.get(name);
        if (text) {
            this.store.delete(name);
        }
        this.setCurrent(undefined);
        return text?.trim();
    }

    all() {
        return Array.from(this.store.values()).join(EOL).trim();
    }

    clear() {
        this.store.clear();
    }
}

export abstract class Printer {
    protected outputBuffer = new OutputBuffer;
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
    };

    error(text: string) {
        const [icon] = this.messages.get(TeamcityEvent.testFailed)!;

        return `${EOL}${icon} ${text}`;
    }

    testVersion(result: TestVersion) {
        const [icon] = this.messages.get(TeamcityEvent.testVersion)!;

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
        this.setCurrent(undefined);

        return result.text.trim();
    }

    testResultSummary(result: TestResultSummary) {
        this.setCurrent(undefined);

        return result.text.trim();
    }

    end(): string | undefined {
        return undefined;
    }

    close() {
    }

    printedOutput(result: TestResult | undefined = undefined) {
        const icon = '🟨';
        if (!result) {
            const text = this.outputBuffer.all();

            return text ? `${icon} ${text}` : undefined;
        }

        const name = 'name' in result ? result.name : '';
        const message = 'message' in result ? result.message : '';

        const pattern = [
            'This test printed output',
            'Test code or tested code printed unexpected output',
        ].join('|');
        const matched = message.match(new RegExp(`(${pattern}):(?<output>.*)`, 'i'));
        const text = !matched ? this.outputBuffer.get(name) : matched?.groups!.output.trim();

        return text ? `${icon} ${text}` : undefined;
    }

    append(line: string) {
        this.outputBuffer.append(line);
    }

    private setCurrent(current?: string) {
        this.outputBuffer.setCurrent(current);
    }
}