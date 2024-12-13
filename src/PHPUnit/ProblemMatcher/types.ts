export enum TestResultEvent {
    testVersion = 'testVersion',
    testRuntime = 'testRuntime',
    testConfiguration = 'testConfiguration',
    testProcesses = 'testProcesses',

    testSuiteStarted = 'testSuiteStarted',
    testCount = 'testCount',

    testStarted = 'testStarted',
    testFailed = 'testFailed',
    testIgnored = 'testIgnored',
    testFinished = 'testFinished',
    testSuiteFinished = 'testSuiteFinished',

    testDuration = 'testDuration',
    testResultSummary = 'testResultSummary',
}

type BaseResult = {
    event: TestResultEvent;
    name: string;
    flowId: number;
}

type InfoResult = {
    event: TestResultEvent;
    text: string;
}

export type TestSuiteStarted = BaseResult & Partial<{
    locationHint: string;
    id: string;
    file: string;
    testId: string;
}>

export type TestStarted = BaseResult & {
    locationHint: string;
    id: string;
    file: string;
    testId: string;
}

export type TestFinished = BaseResult & {
    locationHint: string;
    id: string;
    file: string;
    testId: string;
    duration: number;
}

export type TestFailed = BaseResult & {
    locationHint: string;
    id: string;
    file: string;
    testId: string;
    message: string;
    details: { file: string, line: number }[];
    duration: number;
    type?: string; // comparisonFailure
    actual?: string;
    expected?: string;
}

export type TestIgnored = TestFailed;

export type TestSuiteFinished = BaseResult & Partial<{
    locationHint: string;
    id: string;
    file: string;
    testId: string;
}>;

export type TestVersion = InfoResult & {
    phpunit: string;
    paratest?: string;
}

export type TestRuntime = InfoResult & {
    runtime: string;
}

export type TestConfiguration = InfoResult & {
    configuration: string;
}

export type TestProcesses = InfoResult & {
    processes: string;
};

export type TestCount = Omit<(InfoResult & { count: number; flowId: number; }), 'text'>

export type TestDuration = InfoResult & {
    time: string;
    memory: string;
};

export type TestResultSummary = InfoResult & {
    tests?: number;
    assertions?: number;
    errors?: number;
    failures?: number;
    warnings?: number;
    skipped?: number;
    incomplete?: number;
    risky?: number;
    phpunitDeprecations?: number;
}

export type TestResult = TestSuiteStarted
    | TestStarted
    | TestFailed
    | TestIgnored
    | TestFinished
    | TestSuiteFinished
    | TestVersion
    | TestRuntime
    | TestConfiguration
    | TestProcesses
    | TestCount
    | TestDuration
    | TestResultSummary;
