import { ProblemMatcher } from './ProblemMatcher';
import { ProblemNode, Status } from './ProblemNode';
import { TestNode } from './TestNode';
import { TestSuiteCollection } from './TestSuiteCollection';

export class OutputProblemMatcher extends ProblemMatcher {
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
        return new ProblemNode();
    }

    protected async update(
        problem: ProblemNode,
        m: RegExpMatchArray,
        index: number
    ) {
        switch (index) {
            case 0:
                Object.assign(problem, this.parseNamespace(m[2]), {
                    method: m[3],
                    status: this.currentStatus,
                });

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

        return { namespace, class: clazz };
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
