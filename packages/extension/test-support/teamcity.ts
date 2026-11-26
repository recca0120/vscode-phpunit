import {
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
} from '@vscode-phpunit/phpunit';

type Fields<T> = Partial<Omit<T, 'event'>>;

const builder =
    <T>(event: TeamcityEvent) =>
    (fields: Fields<T> = {}): T =>
        ({ event, flowId: 1, ...fields }) as T;

export const testSuiteStarted = builder<TestSuiteStarted>(TeamcityEvent.testSuiteStarted);
export const testStarted = builder<TestStarted>(TeamcityEvent.testStarted);
export const testFinished = builder<TestFinished>(TeamcityEvent.testFinished);
export const testFailed = builder<TestFailed>(TeamcityEvent.testFailed);
export const testIgnored = builder<TestIgnored>(TeamcityEvent.testIgnored);
export const testSuiteFinished = builder<TestSuiteFinished>(TeamcityEvent.testSuiteFinished);
