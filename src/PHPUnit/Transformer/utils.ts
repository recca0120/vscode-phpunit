import {
    TeamcityEvent,
    type TestFailed,
    type TestIgnored,
    type TestResult,
    type TestStarted,
    type TestSuiteStarted,
} from '../ProblemMatcher';

export const getPrevTestResult = (
    pattern: RegExp,
    cache: Map<string, TestResult>,
    testResult: TestFailed | TestIgnored,
) => {
    for (const prevTestResult of Array.from(cache.values()).reverse()) {
        if (isTestStarted(pattern, prevTestResult)) {
            return prevTestResult as TestStarted | TestSuiteStarted;
        }

        if (prevTestResult.event === TeamcityEvent.testCount) {
            continue;
        }

        if (prevTestResult.event !== testResult.event) {
            break;
        }
    }

    return undefined;
};

const isTestStarted = (pattern: RegExp, testResult: TestResult & { locationHint?: string }) => {
    return (
        (testResult.event === TeamcityEvent.testStarted ||
            testResult.event === TeamcityEvent.testSuiteStarted) &&
        pattern.test(testResult.locationHint ?? '')
    );
};
