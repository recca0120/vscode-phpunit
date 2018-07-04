import { Range } from 'vscode-languageserver-types';

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
    range?: Range;
}

export interface Fault {
    type: string;
    message: string;
    details?: Detail[];
}

export interface Test {
    name: string;
    class: string;
    classname: string;
    file: string;
    line: number;
    range?: Range;
    time: number;
    type: Type;
    fault?: Fault;
}

export interface Method {
    kind: string;
    namespace?: string;
    name: string;
    uri: string;
    range: Range;
}
