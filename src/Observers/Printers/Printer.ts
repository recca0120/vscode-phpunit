import {
    EOL, TestConfiguration, TestDuration, TestFailed, TestFinished, TestProcesses, TestResult, TestResultEvent,
    TestResultSummary, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted, TestVersion,
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
    protected messages = new Map<TestResultEvent, string[]>([
        [TestResultEvent.testVersion, ['🚀', 'STARTED']],
        [TestResultEvent.testFinished, ['✅', 'PASSED']],
        [TestResultEvent.testFailed, ['❌', 'FAILED']],
        [TestResultEvent.testIgnored, ['➖', 'IGNORED']],
    ]);

    static fileFormat(file: string, line: number) {
        return `${file}:${line}`;
    }

    start() {
        this.outputBuffer.clear();
    };

    error(text: string) {
        const [icon] = this.messages.get(TestResultEvent.testFailed)!;

        return `${EOL}${icon} ${text}`;
    }

    testVersion(result: TestVersion) {
        const [icon] = this.messages.get(TestResultEvent.testVersion)!;

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

        return result.text;
    }

    testResultSummary(result: TestResultSummary) {
        this.setCurrent(undefined);

        return result.text;
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
        const matched = message.match(/This\stest\sprinted\soutput:(.*)/);
        const text = !matched ? this.outputBuffer.get(name) : matched[1].trim();

        return text ? `${icon} ${text}` : undefined;
    }

    append(line: string) {
        this.outputBuffer.append(line);
    }

    private setCurrent(current?: string) {
        this.outputBuffer.setCurrent(current);
    }
}