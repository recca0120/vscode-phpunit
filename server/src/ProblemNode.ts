import files from './Filesystem';
import { TestEvent } from './TestExplorer';
import {
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticRelatedInformation,
} from 'vscode-languageserver';

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
    status = Status.FAILURE;
    file = '';
    line = 0;
    message = '';
    files: Location[] = [];

    constructor(private _files = files) {}

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

    async asDiagnostic(): Promise<Diagnostic> {
        const message = this.message.trim();

        return {
            severity:
                this.status === Status.WARNING
                    ? DiagnosticSeverity.Warning
                    : DiagnosticSeverity.Error,
            range: await this._files.lineRange(this.file, this.line),
            message: message,
            source: 'PHPUnit',
            relatedInformation: await Promise.all(
                this.files.map(async l => {
                    return DiagnosticRelatedInformation.create(
                        await this._files.lineLocation(l.file, l.line),
                        message
                    );
                })
            ),
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
