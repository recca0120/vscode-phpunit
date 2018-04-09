import { Location } from 'vscode-languageserver';

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

interface Base extends Location {
    name: string;
    class: string;
    classname: string;
    time: number;
    type: Type;
}

export interface Test extends Base {
    fault?: Fault;
}

export interface Assertion extends Base {
    fault: Fault;
}
