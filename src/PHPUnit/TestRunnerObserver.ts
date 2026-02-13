import { ProcessBuilder } from './ProcessBuilder';
import { TeamcityEvent, TestResult } from './ProblemMatcher';
import type {
    TestConfiguration, TestCount, TestDuration, TestFailed, TestFinished, TestIgnored, TestProcesses,
    TestResultSummary, TestRuntime, TestStarted, TestSuiteFinished, TestSuiteStarted, TestVersion,
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
}>

export class TestRunnerEventProxy implements TestRunnerObserver {
    private listeners: { [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void> } = {};

    [key: string]: any;

    constructor() {
        const allEvents = [
            ...Object.values(TestRunnerEvent),
            ...Object.values(TeamcityEvent),
        ];
        for (const eventName of allEvents) {
            this[eventName] = (result: any) => this.notify(eventName as any, result);
        }
    }

    on<K extends keyof EventResultMap>(eventName: K, fn: (result: EventResultMap[K]) => void): this {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName]?.push(fn);

        return this;
    }

    private notify<K extends keyof EventResultMap>(eventName: K, result: EventResultMap[K]): void {
        this.listeners[eventName]?.forEach(callback => callback(result));
    }
}
