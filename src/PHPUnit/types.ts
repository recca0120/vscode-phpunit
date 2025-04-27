export type Position = {
    character: number;
    line: number;
};

export enum TestType {
    namespace,
    class,
    describe,
    method,
}

export type Annotations = {
    [p: string]: unknown;
    depends?: string[];
    dataProvider?: string[];
    testdox?: string[];
};
export type TestDefinition = {
    type: TestType;
    id: string;
    label: string;
    classFQN?: string;
    namespace?: string;
    className?: string;
    methodName?: string;
    parent?: TestDefinition;
    children?: TestDefinition[]
    depth: number;
    file?: string;
    start?: Position;
    end?: Position;
    annotations?: Annotations;
    testsuite?: string;
};

export interface Teamcity {
    [key: string]: string | number;

    name: string;
    locationHint: string;
    message: string;
    details: string;
}