import { Location } from 'vscode';

export enum Type {
    PASSED = 'passed',
    ERROR = 'error',
    WARNING = 'warning',
    FAILURE = 'failure',
    INCOMPLETE = 'incomplete',
    RISKY = 'risky',
    SKIPPED = 'skipped',
    FAILED = 'failed',
}

export interface Detail extends Location {}

export interface Fault {
    message: string;
    type: string;
    details?: Detail[];
}

export interface TestNode extends Location {
    name: string;
    class: string;
    classname: string;
}

export interface Test extends TestNode {
    time: number;
    type: Type;
    fault?: Fault;
}

export interface Assertion extends Detail {
    related: Test;
}
