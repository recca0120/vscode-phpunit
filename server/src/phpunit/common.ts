import { Range, Location } from 'vscode-languageserver-types';

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
    type: string;
    message: string;
    details?: Detail[];
}

export interface Test extends Location {
    name: string;
    class: string;
    classname: string;
    time: number;
    type: Type;
    fault?: Fault;
}

export interface Method {
    kind: string;
    namespace: string;
    name: string;
    uri: string;
    range: Range;
}
