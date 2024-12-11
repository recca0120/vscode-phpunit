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
    namespace?: string;
    qualifiedClass?: string;
    class?: string;
    method?: string;
    parent?: TestDefinition;
    children?: TestDefinition[]
    file?: string;
    start?: Position;
    end?: Position;
    annotations?: Annotations;
};