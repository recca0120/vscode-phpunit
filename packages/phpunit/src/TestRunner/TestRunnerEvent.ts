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
} from '../TestOutput';
import { TeamcityEvent, type TestResult } from '../TestOutput';
import type { ProcessCommand } from './ProcessCommand';

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
    [TestRunnerEvent.run]: ProcessCommand;
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
