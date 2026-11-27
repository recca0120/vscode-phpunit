export type Position = {
    character: number;
    line: number;
};

export type Range = {
    start: Position;
    end: Position;
};

export enum TestType {
    workspace,
    testsuite,
    namespace,
    class,
    describe,
    method,
    dataset,
}

export type Annotations = {
    [p: string]: unknown;
    depends?: string[];
    dataProvider?: string[];
    dataset?: string[];
    testdox?: string[];
    group?: string[];
    skipped?: boolean;
    skipReason?: string;
    todo?: boolean;
    todoAssignee?: string;
    todoIssue?: string;
    only?: boolean;
    browserTest?: boolean;
    conditionalSkip?: 'onCi' | 'locally';
};
export type TestDefinition = {
    type: TestType;
    id: string;
    label: string;
    classFQN?: string;
    namespace?: string;
    className?: string;
    methodName?: string;
    children?: TestDefinition[];
    file?: string;
    start?: Position;
    end?: Position;
    annotations?: Annotations;
    testsuite?: string;
};
