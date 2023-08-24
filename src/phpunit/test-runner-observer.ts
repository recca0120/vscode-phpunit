import { Result, TestConfiguration, TestCount, TestExtraResultEvent, TestProcesses, TestResult, TestResultEvent, TestResultKind, TestResultSummary, TestRuntime, TestVersion, TimeAndMemory } from './problem-matcher';

export enum TestRunnerEvent {
    run = 'run',
    line = 'line',
    result = 'result',
    output = 'output',
    error = 'error',
    close = 'close',
}

export type TestRunnerObserver = {
    [TestRunnerEvent.run]?: (command: string) => void;
    [TestRunnerEvent.line]?: (line: string) => void;
    [TestRunnerEvent.result]?: (result: Result) => void;
    [TestRunnerEvent.output]?: (output: string) => void;
    [TestRunnerEvent.error]?: (error: string) => void;
    [TestRunnerEvent.close]?: (code: number | null) => void;
    [TestExtraResultEvent.testVersion]?: (result: TestVersion) => void;
    [TestExtraResultEvent.testProcesses]?: (result: TestProcesses) => void;
    [TestExtraResultEvent.testRuntime]?: (result: TestRuntime) => void;
    [TestExtraResultEvent.testConfiguration]?: (result: TestConfiguration) => void;
    [TestExtraResultEvent.testCount]?: (result: TestCount) => void;
    [TestExtraResultEvent.testResultSummary]?: (result: TestResultSummary) => void;
    [TestExtraResultEvent.timeAndMemory]?: (result: TimeAndMemory) => void;
} & { [p in TestResultEvent]?: (result: TestResult) => void };

export class DefaultObserver implements TestRunnerObserver {
    private listeners = [
        ...Object.values(TestRunnerEvent),
        ...Object.values(TestResultEvent),
        ...Object.values(TestExtraResultEvent),
    ].reduce((listeners, key) => {
        listeners[key] = [];
        return listeners;
    }, {} as { [p: string]: Array<Function> });

    run(command: string): void {
        this.trigger(TestRunnerEvent.run, command);
    }

    output(output: string): void {
        this.trigger(TestRunnerEvent.output, output);
    }

    error(error: string): void {
        this.trigger(TestRunnerEvent.error, error);
    }

    close(code: number | null): void {
        this.trigger(TestRunnerEvent.close, code);
    }

    line(line: string): void {
        this.trigger(TestRunnerEvent.line, line);
    }

    result(result: Result): void {
        this.trigger(TestRunnerEvent.result, result);
    }

    testVersion(result: TestVersion): void {
        this.trigger(TestExtraResultEvent.testVersion, result);
    }

    testProcesses(result: TestProcesses): void {
        this.trigger(TestExtraResultEvent.testProcesses, result);
    }

    testRuntime(result: TestRuntime): void {
        this.trigger(TestExtraResultEvent.testRuntime, result);
    }

    testConfiguration(result: TestConfiguration): void {
        this.trigger(TestExtraResultEvent.testConfiguration, result);
    }

    testSuiteStarted(result: Result): void {
        this.trigger(TestResultEvent.testSuiteStarted, result);
    }

    testSuiteFinished(result: Result): void {
        this.trigger(TestResultEvent.testSuiteFinished, result);
    }

    testStarted(result: Result): void {
        this.trigger(TestResultEvent.testStarted, result);
    }

    testFinished(result: Result): void {
        this.trigger(TestResultEvent.testFinished, result);
    }

    testFailed(result: Result): void {
        this.trigger(TestResultEvent.testFailed, result);
    }

    testIgnored(result: Result): void {
        this.trigger(TestResultEvent.testIgnored, result);
    }

    testCount(result: Result): void {
        this.trigger(TestExtraResultEvent.testCount, result);
    }

    timeAndMemory(result: TimeAndMemory): void {
        this.trigger(TestExtraResultEvent.timeAndMemory, result);
    }

    testResultSummary(result: TestResultSummary): void {
        this.trigger(TestExtraResultEvent.testResultSummary, result);
    }

    on(eventName: TestRunnerEvent | TestResultKind, fn: Function) {
        this.listeners[eventName].push(fn);

        return this;
    }

    private trigger(
        eventName: TestRunnerEvent | TestResultKind,
        result: Result | string | number | null,
    ) {
        this.listeners[eventName].forEach((fn) => fn(result));
    }
}
