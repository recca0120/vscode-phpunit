import files, { Filesystem } from './Filesystem';
import { Location, Range } from 'vscode-languageserver-protocol';

export abstract class ProblemMatcher<T> {
    private problems: any[] = [];
    private problemIndex = -1;
    private currentIndex = -1;

    constructor(private patterns: RegExp[] = []) {}

    async parse(contents: string): Promise<T[]> {
        const lines: string[] = contents.split(/\r\n|\r|\n/g);

        this.problems = [];
        this.problemIndex = -1;
        let current: RegExpMatchArray;
        let next: RegExpMatchArray;
        for (const line of lines) {
            this.parseLine(line);
            if ((next = line.match(this.nextRule))) {
                if (this.nextIndex === 0) {
                    this.problemIndex++;
                }

                this.currentIndex = this.nextIndex;
                await this.doUpdate(next);

                continue;
            }

            if (this.currentIndex === -1) {
                continue;
            }

            if ((current = line.match(this.currentRule))) {
                await this.doUpdate(current);
            } else {
                this.currentIndex = -1;
            }
        }

        return this.problems;
    }

    protected abstract parseLine(line: string): void;

    protected abstract async create(m: RegExpMatchArray): Promise<T>;

    protected abstract async update(
        problem: T,
        m: RegExpMatchArray,
        index: number
    ): Promise<void>;

    private async doUpdate(m: RegExpMatchArray) {
        if (!this.problems[this.problemIndex]) {
            this.problems[this.problemIndex] = await this.create(m);
        }

        await this.update(
            this.problems[this.problemIndex],
            m,
            this.currentIndex
        );
    }

    private get currentRule() {
        return this.patterns[this.currentIndex];
    }

    private get nextRule() {
        return this.patterns[this.nextIndex];
    }

    private get nextIndex() {
        return this.currentIndex === this.patterns.length - 1
            ? 0
            : this.currentIndex + 1;
    }
}

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

export class PHPUnitOutput extends ProblemMatcher<Problem> {
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
