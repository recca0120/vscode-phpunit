import { Annotations } from './AnnotationParser';

export type Position = {
    character: number;
    line: number;
};

export enum TestType {
    namespace,
    class,
    method
}

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
};