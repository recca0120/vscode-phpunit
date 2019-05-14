export abstract class ProblemMatcher<T> {
    private problems: any[] = [];
    private problemIndex = -1;
    private currentIndex = -1;

    constructor(private patterns: RegExp[] = []) {}

    async parse(contents: string): Promise<T[]> {
        const lines: string[] = contents.split(/\r\n|\r|\n/g);

        this.problems = [];
        this.problemIndex = -1;
        let current: RegExpMatchArray | null;
        let next: RegExpMatchArray | null;
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

interface Location {
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

    constructor() {
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
            let location: any = problem.files
                .slice()
                .reverse()
                .find(loation => {
                    return new RegExp(`${problem.class}.php`).test(
                        loation.file
                    );
                });
            if (!location) {
                location = {
                    file: '',
                    line: -1,
                };
            } else {
                problem.files = problem.files.filter(l => l !== location);
            }

            return Object.assign(problem, location);
        });
    }

    protected parseLine(line: string) {
        let m: RegExpMatchArray | null;
        if ((m = line.match(this.statusPattern))) {
            this.currentStatus = this.asStatus(m[2].trim().toLowerCase());
        }
    }

    protected async create(m: RegExpMatchArray): Promise<Problem> {
        return {
            type: 'problem',
            id: m[1],
            namespace: '',
            class: '',
            method: '',
            status: this.currentStatus,
            file: '',
            line: 0,
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

                break;
            case 1:
                problem.message += `${m[1]}\n`;
                break;
            case 2:
                problem.files.push({
                    file: m[1],
                    line: parseInt(m[2], 10),
                });
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
