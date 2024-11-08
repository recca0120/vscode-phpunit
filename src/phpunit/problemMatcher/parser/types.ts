export enum TestResultEvent {
    testSuiteStarted = 'testSuiteStarted',
    testSuiteFinished = 'testSuiteFinished',
    testStarted = 'testStarted',
    testFailed = 'testFailed',
    testIgnored = 'testIgnored',
    testFinished = 'testFinished',
}

export enum TestExtraResultEvent {
    testVersion = 'testVersion',
    testRuntime = 'testRuntime',
    testConfiguration = 'testConfiguration',
    testProcesses = 'testProcesses',
    testCount = 'testCount',
    timeAndMemory = 'timeAndMemory',
    testResultSummary = 'testResultSummary',
}

export type TestResultKind = TestResultEvent | TestExtraResultEvent;

type TestResultBase = {
    kind: TestResultKind;
    event: TestResultEvent;
    name: string;
    flowId: number;
};

export type TestSuiteStarted = TestResultBase & {
    id?: string;
    file?: string;
    locationHint?: string;
    testId?: string;
};

export type TestSuiteFinished = TestResultBase;

export type TestStarted = TestResultBase & {
    id: string;
    file: string;
    locationHint: string;
};

export type TestFinished = TestResultBase & {
    duration: number;
};

export type TestFailed = TestFinished & {
    message: string;
    details: Array<{ file: string; line: number }>;
    type?: string;
    actual?: string;
    expected?: string;
};

export type TestIgnored = TestFailed;

export type TestCount = {
    kind: TestResultKind;
    event: TestResultEvent;
    count: number;
    flowId: number;
};

export type TestVersion = {
    kind: TestResultKind;
    text: string;
    phpunit: string;
    paratest?: string;
};

export type TestRuntime = {
    kind: TestResultKind;
    text: string;
    runtime: string;
};

export type TestConfiguration = {
    kind: TestResultKind;
    text: string;
    configuration: string;
};

export type TestProcesses = {
    kind: TestResultKind;
    text: string;
    processes: string;
};

export type TimeAndMemory = {
    kind: TestResultKind;
    text: string;
    time: string;
    memory: string;
};

export type TestResultSummary = {
    kind: TestResultKind;
    text: string;
    tests?: number;
    assertions?: number;
    errors?: number;
    failures?: number;
    skipped?: number;
    incomplete?: number;
    risky?: number;
    phpunitDeprecations?: number;
};

export type TestResult = TestSuiteStarted &
    TestSuiteFinished &
    TestStarted &
    TestFailed &
    TestIgnored &
    TestFinished;

export type Result = TestResult | TestResultSummary | TestCount | TimeAndMemory;

export interface IParser<T> {
    is: (text: string) => boolean;
    parse: (text: string) => T;
}

export abstract class ValueParser<T> implements IParser<T> {
    private pattern = new RegExp(`^${this.name}:\\s+(?<${this.name}>.+)`, 'i');

    protected constructor(
        private name: string,
        private kind: TestResultKind,
    ) {}

    is(text: string): boolean {
        return !!text.match(this.pattern);
    }

    parse(text: string) {
        const groups = text.match(this.pattern)!.groups!;

        return {
            kind: this.kind,
            [this.name.toLowerCase()]: groups[this.name],
            text,
        } as T;
    }
}
