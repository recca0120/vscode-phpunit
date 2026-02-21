import type { ProcessBuilder } from './ProcessBuilder';
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
} from './TestOutput';
import { TeamcityEvent, type TestResult } from './TestOutput';

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

type EventListeners = {
    [K in keyof EventResultMap]?: Array<(result: EventResultMap[K]) => void>;
};

export interface TestRunnerEventProxy extends Required<TestRunnerObserver> {
    on<K extends keyof EventResultMap>(
        eventName: K,
        fn: (result: EventResultMap[K]) => void,
    ): TestRunnerEventProxy;
}

export function createTestRunnerEventProxy(): TestRunnerEventProxy {
    const listeners: EventListeners = {};

    const on = <K extends keyof EventResultMap>(
        eventName: K,
        fn: (result: EventResultMap[K]) => void,
    ): TestRunnerEventProxy => {
        if (!listeners[eventName]) {
            listeners[eventName] = [];
        }
        listeners[eventName]?.push(fn);
        return proxy;
    };

    const notify = <K extends keyof EventResultMap>(
        eventName: K,
        result: EventResultMap[K],
    ): void => {
        const callbacks = listeners[eventName];
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            callback(result);
        }
    };

    const proxy = new Proxy({} as TestRunnerEventProxy, {
        get(_target, prop: string) {
            if (prop === 'on') {
                return on;
            }
            return (result: unknown) => notify(prop as keyof EventResultMap, result as never);
        },
    });

    return proxy;
}
