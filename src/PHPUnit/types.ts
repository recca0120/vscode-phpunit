export const PHPUNIT_TESTCASE_FQN = 'PHPUnit\\Framework\\TestCase';
export const PEST_PREFIX = 'P\\';

export type Position = {
    character: number;
    line: number;
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

export interface Teamcity {
    [key: string]: string | number;

    name: string;
    locationHint: string;
    message: string;
    details: string;
}
