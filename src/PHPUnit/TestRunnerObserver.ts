import type {
    TestConfiguration,
    TestCount,
    TestDuration,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestProcesses,
    TestResultSummary,
    TestRuntime,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
    TestVersion,
} from './ProblemMatcher';
import { TeamcityEvent, type TestResult } from './ProblemMatcher';
import type { ProcessBuilder } from './ProcessBuilder';

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
    [TestRunnerEvent.run]: ProcessBuilder;
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
}>;

export class TestRunnerEventProxy implements TestRunnerObserver {
    private listeners: {
        [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void>;
    } = {};

    start(): void {
        this.notify(TestRunnerEvent.start, undefined);
    }
    run(builder: ProcessBuilder): void {
        this.notify(TestRunnerEvent.run, builder);
    }
    line(line: string): void {
        this.notify(TestRunnerEvent.line, line);
    }
    result(result: TestResult): void {
        this.notify(TestRunnerEvent.result, result);
    }
    output(output: string): void {
        this.notify(TestRunnerEvent.output, output);
    }
    error(error: string): void {
        this.notify(TestRunnerEvent.error, error);
    }
    close(code: number | null): void {
        this.notify(TestRunnerEvent.close, code);
    }
    abort(): void {
        this.notify(TestRunnerEvent.abort, undefined);
    }
    done(): void {
        this.notify(TestRunnerEvent.done, undefined);
    }

    testVersion(result: TestVersion): void {
        this.notify(TeamcityEvent.testVersion, result);
    }
    testProcesses(result: TestProcesses): void {
        this.notify(TeamcityEvent.testProcesses, result);
    }
    testRuntime(result: TestRuntime): void {
        this.notify(TeamcityEvent.testRuntime, result);
    }
    testConfiguration(result: TestConfiguration): void {
        this.notify(TeamcityEvent.testConfiguration, result);
    }
    testSuiteStarted(result: TestSuiteStarted): void {
        this.notify(TeamcityEvent.testSuiteStarted, result);
    }
    testCount(result: TestCount): void {
        this.notify(TeamcityEvent.testCount, result);
    }
    testStarted(result: TestStarted): void {
        this.notify(TeamcityEvent.testStarted, result);
    }
    testFinished(result: TestFinished): void {
        this.notify(TeamcityEvent.testFinished, result);
    }
    testFailed(result: TestFailed): void {
        this.notify(TeamcityEvent.testFailed, result);
    }
    testIgnored(result: TestIgnored): void {
        this.notify(TeamcityEvent.testIgnored, result);
    }
    testSuiteFinished(result: TestSuiteFinished): void {
        this.notify(TeamcityEvent.testSuiteFinished, result);
    }
    testDuration(result: TestDuration): void {
        this.notify(TeamcityEvent.testDuration, result);
    }
    testResultSummary(result: TestResultSummary): void {
        this.notify(TeamcityEvent.testResultSummary, result);
    }

    on<K extends keyof EventResultMap>(
        eventName: K,
        fn: (result: EventResultMap[K]) => void,
    ): this {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]?.push(fn);

        return this;
    }

    private notify<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]): void {
        this.listeners[eventName]?.forEach((callback) => callback(result));
    }
}
