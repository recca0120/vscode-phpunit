import { TestEvent } from './TestExplorer';

export enum Status {
    UNKNOWN,
    PASSED,
    SKIPPED,
    INCOMPLETE,
    FAILURE,
    ERROR,
    RISKY,
    WARNING,
}

export const states: Map<Status, TestEvent['state']> = new Map([
    [Status.UNKNOWN, 'errored'],
    [Status.PASSED, 'passed'],
    [Status.SKIPPED, 'skipped'],
    [Status.INCOMPLETE, 'skipped'],
    [Status.FAILURE, 'failed'],
    [Status.ERROR, 'errored'],
    [Status.RISKY, 'failed'],
    [Status.WARNING, 'failed'],
]);

export interface Location {
    file: string;
    line: number;
}

export interface Problem extends Location {
    type: 'problem';
    id: string;
    namespace?: string;
    class?: string;
    method?: string;
    status: Status;
    message: string;
    files: Location[];
}

export class ProblemNode implements Problem {
    type: 'problem' = 'problem';
    id = '';
    namespace = '';
    class = '';
    method = '';
    file = '';
    line = 0;
    message = '';
    files: Location[] = [];

    constructor(public status: Status) {}

    updateId() {
        const qualifiedClassName = [this.namespace, this.class]
            .filter(name => !!name)
            .join('\\');

        this.id = `${qualifiedClassName}::${this.method}`;

        return this;
    }

    asTestEvent(): TestEvent {
        return {
            type: 'test',
            test: this.id,
            state: this.getEventState() as TestEvent['state'],
            message: this.message,
            decorations: this.asTestDecorations(),
        };
    }

    private asTestDecorations() {
        return [{ file: this.file, line: this.line }]
            .concat(this.files)
            .filter(l => l.file === this.file && l.line >= 0)
            .map(location => ({
                line: location.line,
                message: this.message,
            }));
    }

    private getEventState(): TestEvent['state'] | undefined {
        return states.get(this.status);
    }
}
