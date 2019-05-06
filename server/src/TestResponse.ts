import files, { Filesystem } from './Filesystem';
import { ProblemMatcher as ProblemMatcherBase } from './ProblemMatcher';
import {
    Range,
    Location,
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticRelatedInformation,
} from 'vscode-languageserver-protocol';

export interface Problem {
    id: string;
    namespace?: string;
    class?: string;
    method?: string;
    status: Status;
    uri: string;
    range: Range;
    message: string;
    files: Location[];
}

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

export class ProblemMatcher extends ProblemMatcherBase<Problem> {
    private currentStatus: Status = this.asStatus('failure');

    private status = [
        'UNKNOWN',
        'PASSED',
        'SKIPPED',
        'INCOMPLETE',
        'FAILURE',
        'ERROR',
        'RISKY',
        'WARNING',
    ].join('|');

    private statusPattern = new RegExp(
        `There (was|were) \\d+ (${this.status})(s?)( test?)(:?)`,
        'i'
    );

    constructor(private _files: Filesystem = files) {
        super([
            new RegExp('^\\d+\\)\\s(([^:]*)::([^\\s]*).*)$'),
            new RegExp('^(.*)$'),
            new RegExp('^(.*):(\\d+)$'),
        ]);
    }

    async parse(contents: string): Promise<Problem[]> {
        this.currentStatus = this.asStatus('failure');
        const problems = await super.parse(contents);

        return problems.map(problem => {
            let location = problem.files
                .slice()
                .reverse()
                .find(file => {
                    return new RegExp(`${problem.class}.php$`).test(file.uri);
                });
            if (!location) {
                location = problem.files[problem.files.length - 1];
            } else {
                problem.files = problem.files.filter(l => l !== location);
            }
            return Object.assign(problem, location);
        });
    }

    protected parseLine(line: string) {
        let m: RegExpMatchArray;
        if ((m = line.match(this.statusPattern))) {
            this.currentStatus = this.asStatus(m[2].trim().toLowerCase());
        }
    }

    protected async create(m: RegExpMatchArray): Promise<Problem> {
        return {
            id: m[1],
            namespace: '',
            class: '',
            method: '',
            status: this.currentStatus,
            uri: '',
            range: Range.create(0, 0, 0, 0),
            message: '',
            files: [],
        };
    }

    protected async update(
        problem: Problem,
        m: RegExpMatchArray,
        index: number
    ) {
        switch (index) {
            case 0:
                problem.namespace = m[2]
                    .substr(0, m[2].lastIndexOf('\\'))
                    .replace(/\\$/, '');

                problem.class = m[2]
                    .substr(m[2].lastIndexOf('\\'))
                    .replace(/^\\/, '');

                problem.id = m[1];
                problem.method = m[3];

                problem.id = m[1];

                break;
            case 1:
                problem.message += `${m[1]}\n`;
                break;
            case 2:
                problem.files.push(
                    await this._files.lineLocation(m[1], parseInt(m[2], 10) - 1)
                );
                break;
        }
    }

    private asStatus(status: string): Status {
        for (const name in Status) {
            if (name.toLowerCase() === status) {
                return Status[name] as any;
            }
        }

        return Status.ERROR;
    }
}

export class TestResponse {
    constructor(
        private output: string,
        private problemMatcher: ProblemMatcher = new ProblemMatcher()
    ) {}

    async asDiagnosticGroup(
        relatedInfo: boolean = true
    ): Promise<Map<string, Diagnostic[]>> {
        const problemGroup = this.groupBy(
            await this.problemMatcher.parse(this.output)
        );

        const diagnosticGroup = new Map<string, Diagnostic[]>();

        problemGroup.forEach((problems, uri) => {
            const diagnostics = problems
                .map(problem => this.problemToDiagnostic(problem, relatedInfo))
                .filter(diagnostic => !!diagnostic);

            diagnosticGroup.set(uri, diagnostics);
        });
        problemGroup.clear();

        return diagnosticGroup;
    }

    private problemToDiagnostic(
        problem: Problem,
        hasRelatedInformation: boolean
    ): Diagnostic | undefined {
        if (problem.status === Status.PASSED) {
            return undefined;
        }

        const diagnostic: Diagnostic = {
            severity:
                problem.status === Status.WARNING
                    ? DiagnosticSeverity.Warning
                    : DiagnosticSeverity.Error,
            range: problem.range,
            message: problem.message.trim(),
            source: 'PHPUnit',
        };

        if (hasRelatedInformation) {
            diagnostic.relatedInformation = problem.files.map(file => {
                return DiagnosticRelatedInformation.create(
                    file,
                    problem.message.trim()
                );
            });
        }

        return diagnostic;
    }

    private groupBy(problems: Problem[]) {
        return problems.reduce((group, problem) => {
            const problems: Problem[] = [problem];
            if (group.has(problem.uri)) {
                problems.push(...group.get(problem.uri));
            }

            group.set(problem.uri, problems);

            return group;
        }, new Map<string, Problem[]>());
    }

    toString(): string {
        return this.output;
    }
}
