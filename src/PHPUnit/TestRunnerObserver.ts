import { Builder } from './CommandBuilder';
import {
    TeamcityEvent, TestConfiguration, TestCount, TestDuration, TestFailed, TestFinished, TestIgnored, TestProcesses,
    TestResult, TestResultSummary, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted, TestVersion,
} from './ProblemMatcher';

export enum TestRunnerEvent {
    start = 'start',
    run = 'run',
    line = 'line',
    result = 'result',
    output = 'output',
    error = 'error',
    close = 'close',
    abort = 'abort',
    done = 'done',
}

export type EventResultMap = {
    [TestRunnerEvent.start]: undefined;
    [TestRunnerEvent.run]: Builder;
    [TestRunnerEvent.line]: string;
    [TestRunnerEvent.result]: TestResult;
    [TestRunnerEvent.output]: string;
    [TestRunnerEvent.error]: string;
    [TestRunnerEvent.close]: number | null;
    [TestRunnerEvent.abort]: undefined;
    [TestRunnerEvent.done]: undefined;
    [TeamcityEvent.testVersion]: TestVersion;
    [TeamcityEvent.testProcesses]: TestProcesses;
    [TeamcityEvent.testRuntime]: TestRuntime;
    [TeamcityEvent.testConfiguration]: TestConfiguration;
    [TeamcityEvent.testSuiteStarted]: TestSuiteStarted;
    [TeamcityEvent.testCount]: TestCount;
    [TeamcityEvent.testStarted]: TestStarted;
    [TeamcityEvent.testFinished]: TestFinished;
    [TeamcityEvent.testFailed]: TestFailed;
    [TeamcityEvent.testIgnored]: TestIgnored;
    [TeamcityEvent.testSuiteFinished]: TestSuiteFinished;
    [TeamcityEvent.testDuration]: TestDuration;
    [TeamcityEvent.testResultSummary]: TestResultSummary;
};

export type TestRunnerObserver = Partial<{
    [K in keyof EventResultMap]: (result: EventResultMap[K]) => void;
} & { [p in TeamcityEvent]: (result: EventResultMap[p]) => void }>

export class TestRunnerEventProxy implements TestRunnerObserver {
    private listeners: { [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void> } = {};

    start(): void {
        this.emit(TestRunnerEvent.start, undefined);
    }

    run(builder: Builder): void {
        this.emit(TestRunnerEvent.run, builder);
    }

    line(line: string): void {
        this.emit(TestRunnerEvent.line, line);
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

    done(): void {
        this.emit(TestRunnerEvent.done, undefined);
    }

    result(result: TestResult): void {
        this.emit(TestRunnerEvent.result, result);
    }

    testVersion(result: TestVersion): void {
        this.emit(TeamcityEvent.testVersion, result);
    }

    testProcesses(result: TestProcesses): void {
        this.emit(TeamcityEvent.testProcesses, result);
    }

    testRuntime(result: TestRuntime): void {
        this.emit(TeamcityEvent.testRuntime, result);
    }

    testConfiguration(result: TestConfiguration): void {
        this.emit(TeamcityEvent.testConfiguration, result);
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.emit(TeamcityEvent.testSuiteStarted, result);
    }

    testCount(result: TestCount): void {
        this.emit(TeamcityEvent.testCount, result);
    }

    testStarted(result: TestStarted): void {
        this.emit(TeamcityEvent.testStarted, result);
    }

    testFinished(result: TestFinished): void {
        this.emit(TeamcityEvent.testFinished, result);
    }

    testFailed(result: TestFailed): void {
        this.emit(TeamcityEvent.testFailed, result);
    }

    testIgnored(result: TestIgnored): void {
        this.emit(TeamcityEvent.testIgnored, result);
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.emit(TeamcityEvent.testSuiteFinished, result);
    }

    testDuration(result: TestDuration): void {
        this.emit(TeamcityEvent.testDuration, result);
    }

    testResultSummary(result: TestResultSummary): void {
        this.emit(TeamcityEvent.testResultSummary, result);
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
