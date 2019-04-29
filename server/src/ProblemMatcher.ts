import { Location, Range } from 'vscode-languageserver-protocol';
import files, { Filesystem } from './Filesystem';

abstract class ProblemMatcherBase<T> {
    private problems = [];
    private problemIndex = -1;
    private currentIndex = -1;

    constructor(private patterns: RegExp[] = []) {}

    async parse(contents: string): Promise<Problem[]> {
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

export enum PHPUnitStatus {
    UNKNOWN,
    PASSED,
    SKIPPED,
    INCOMPLETE,
    FAILURE,
    ERROR,
    RISKY,
    WARNING,
}

export interface Problem {
    name: string;
    namespace: string;
    class: string;
    method: string;
    status: PHPUnitStatus;
    uri: string;
    range: Range;
    message: string;
    files: Location[];
}

export class ProblemMatcher extends ProblemMatcherBase<Problem> {
    private currentStatus: PHPUnitStatus = this.asStatus('failure');

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
            return Object.assign(
                problem,
                problem.files.reverse().find(file => {
                    return !/vendor\//.test(file.uri);
                })
            );
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
            name: m[1],
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

                problem.name = m[1];
                problem.method = m[3];
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

    private asStatus(status: string): PHPUnitStatus {
        for (const name in PHPUnitStatus) {
            if (name.toLowerCase() === status) {
                return PHPUnitStatus[name] as any;
            }
        }

        return PHPUnitStatus.ERROR;
    }
}
