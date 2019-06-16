import { ProblemNode, Status } from './Problem';
import { TestNode } from './Parser';
import { TestSuiteCollection } from './TestSuiteCollection';

export abstract class ProblemMatcher {
    private problems: ProblemNode[] = [];
    private problemIndex = -1;
    private currentIndex = -1;

    constructor(private patterns: RegExp[] = []) {}

    async parse(contents: string): Promise<ProblemNode[]> {
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

    protected abstract async create(m: RegExpMatchArray): Promise<ProblemNode>;

    protected abstract async update(
        problem: ProblemNode,
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

export class PHPUnitOutput extends ProblemMatcher {
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

    constructor(private suites?: TestSuiteCollection) {
        super([
            new RegExp('^\\d+\\)\\s(([^:]*)::([^\\s]*).*)$'),
            new RegExp('^(.*)$'),
            new RegExp('^(.*):(\\d+)$'),
        ]);
    }

    async parse(contents: string): Promise<ProblemNode[]> {
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
                location = this.findLocationFromSuites(problem);
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

    protected async create(): Promise<ProblemNode> {
        return new ProblemNode(this.currentStatus);
    }

    protected async update(
        problem: ProblemNode,
        m: RegExpMatchArray,
        index: number
    ) {
        switch (index) {
            case 0:
                const { namespace, clazz } = this.parseNamespace(m[2]);
                problem.namespace = namespace;
                problem.class = clazz;
                problem.method = m[3];

                problem.updateId();

                break;
            case 1:
                problem.message += `${m[1]}\n`;
                break;
            case 2:
                problem.files.push({
                    file: m[1],
                    line: parseInt(m[2], 10) - 1,
                });
                break;
        }
    }

    private parseNamespace(name: string) {
        const lastIndexOfSlash = name.lastIndexOf('\\');
        let namespace = '';
        let clazz = '';
        if (lastIndexOfSlash >= 0) {
            namespace = name.substr(0, lastIndexOfSlash).replace(/\\$/, '');
            clazz = name.substr(lastIndexOfSlash).replace(/^\\/, '');
        } else {
            clazz = name;
        }

        return { namespace, clazz };
    }

    private asStatus(status: string): Status {
        for (const name in Status) {
            if (name.toLowerCase() === status) {
                return Status[name] as any;
            }
        }

        return Status.ERROR;
    }

    private findLocationFromSuites(problem: ProblemNode) {
        const location = {
            file: '',
            line: -1,
        };

        if (!this.suites) {
            return location;
        }

        const suiteId = [problem.namespace, problem.class]
            .filter(s => !!s)
            .join('\\');

        const suites = this.suites.where(suite => suite.id === suiteId, true);

        if (suites.length === 0) {
            return location;
        }

        const suite = suites[0];

        const test: TestNode = suite.children.find(
            (test: TestNode) => test.id === `${suiteId}::${problem.method}`
        );

        if (!test) {
            return location;
        }

        return {
            file: test.file,
            line: test.line,
        };
    }
}
