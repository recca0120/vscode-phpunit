import {
    TestConfiguration, TestCount, TestDuration, TestFailed, TestFinished, TestIgnored, TestProcesses, TestResult,
    TestResultEvent, TestResultSummary, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted, TestVersion,
} from './ProblemMatcher';

export enum TestRunnerEvent {
    run = 'run',
    line = 'line',
    result = 'result',
    output = 'output',
    error = 'error',
    close = 'close',
    abort = 'abort',
}

export type EventResultMap = {
    [TestRunnerEvent.run]: string;
    [TestRunnerEvent.line]: string;
    [TestRunnerEvent.result]: TestResult;
    [TestRunnerEvent.output]: string;
    [TestRunnerEvent.error]: string;
    [TestRunnerEvent.close]: number | null;
    [TestRunnerEvent.abort]: undefined;
    [TestResultEvent.testVersion]: TestVersion;
    [TestResultEvent.testProcesses]: TestProcesses;
    [TestResultEvent.testRuntime]: TestRuntime;
    [TestResultEvent.testConfiguration]: TestConfiguration;
    [TestResultEvent.testSuiteStarted]: TestSuiteStarted;
    [TestResultEvent.testCount]: TestCount;
    [TestResultEvent.testStarted]: TestStarted;
    [TestResultEvent.testFinished]: TestFinished;
    [TestResultEvent.testFailed]: TestFailed;
    [TestResultEvent.testIgnored]: TestIgnored;
    [TestResultEvent.testSuiteFinished]: TestSuiteFinished;
    [TestResultEvent.testDuration]: TestDuration;
    [TestResultEvent.testResultSummary]: TestResultSummary;
};

export type TestRunnerObserver = Partial<{
    [K in keyof EventResultMap]: (result: EventResultMap[K]) => void;
} & { [p in TestResultEvent]: (result: EventResultMap[p]) => void }>

export class TestRunnerEventProxy implements TestRunnerObserver {
    private listeners: { [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void> } = {};

    run(command: string): void {
        this.emit(TestRunnerEvent.run, command);
    }

    output(output: string): void {
        this.emit(TestRunnerEvent.output, output);
    }

    error(error: string): void {
        this.emit(TestRunnerEvent.error, error);
    }

    close(code: number | null): void {
        this.emit(TestRunnerEvent.close, code);
    }

    abort(): void {
        this.emit(TestRunnerEvent.abort, undefined);
    }

    line(line: string): void {
        this.emit(TestRunnerEvent.line, line);
    }

    result(result: TestResult): void {
        this.emit(TestRunnerEvent.result, result);
    }

    testVersion(result: TestVersion): void {
        this.emit(TestResultEvent.testVersion, result);
    }

    testProcesses(result: TestProcesses): void {
        this.emit(TestResultEvent.testProcesses, result);
    }

    testRuntime(result: TestRuntime): void {
        this.emit(TestResultEvent.testRuntime, result);
    }

    testConfiguration(result: TestConfiguration): void {
        this.emit(TestResultEvent.testConfiguration, result);
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.emit(TestResultEvent.testSuiteStarted, result);
    }

    testCount(result: TestCount): void {
        this.emit(TestResultEvent.testCount, result);
    }

    testStarted(result: TestStarted): void {
        this.emit(TestResultEvent.testStarted, result);
    }

    testFinished(result: TestFinished): void {
        this.emit(TestResultEvent.testFinished, result);
    }

    testFailed(result: TestFailed): void {
        this.emit(TestResultEvent.testFailed, result);
    }

    testIgnored(result: TestIgnored): void {
        this.emit(TestResultEvent.testIgnored, result);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.emit(TestResultEvent.testSuiteFinished, result);
    }

    testDuration(result: TestDuration): void {
        this.emit(TestResultEvent.testDuration, result);
    }

    testResultSummary(result: TestResultSummary): void {
        this.emit(TestResultEvent.testResultSummary, result);
    }

    on<K extends keyof EventResultMap>(eventName: K, fn: (result: EventResultMap[K]) => void): this {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]?.push(fn);

        return this;
    }

    private emit<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]): void {
        this.listeners[eventName]?.forEach(callback => callback(result));
    }
}
