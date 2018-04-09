import { Range } from 'vscode-languageserver';

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

export interface Detail {
    file: string;
    line: number;
    range: Range;
}

export interface Fault {
    message: string;
    type?: string;
    details?: Detail[];
}

export interface Assertion extends Detail {
    name: string;
    class: string;
    classname: string;
    type?: Type;
    fault?: Fault;
}

export interface Test extends Assertion {
    type: Type;
    time: number;
}
