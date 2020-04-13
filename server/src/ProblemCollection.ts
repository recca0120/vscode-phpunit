import files from './Filesystem';
import { Diagnostic } from 'vscode-languageserver';
import { Problem, ProblemNode, Status } from './ProblemNode';
import { TestEvent, TestSuiteEvent } from './TestExplorer';
import { TestEventGroup } from './TestEventCollection';
import { TestNode, TestSuiteNode } from './TestNode';

export class ProblemCollection {
    private problems: Map<string, ProblemNode> = new Map();
    private remoteCwd: string = '';

    constructor(private _files = files) {}

    setRemoteCwd(remoteCwd: string) {
        this.remoteCwd = remoteCwd;
        this._files.setRemoteCwd(this.remoteCwd);

        return this;
    }

    put(tests: TestEventGroup | TestEventGroup[]) {
        const problems = this.asProblems(
            tests instanceof Array ? tests : [tests]
        );

        problems.forEach(problem =>
            problem instanceof ProblemNode
                ? this.problems.set(problem.id, problem)
                : this.setProblemPassed(problem.id)
        );

        return this;
    }

    all(): ProblemNode[] {
        return Array.from(this.problems.values());
    }

    async asDiagnosticGroup() {
        const problemGroups = this.groupByProblems();

        const groups = new Map<string, Diagnostic[]>();
        for (const [file, problems] of problemGroups) {
            groups.set(
                this._files.asUri(file).toString(),
                await Promise.all(
                    problems.map(problem => problem.asDiagnostic())
                )
            );
        }

        return groups;
    }

    private groupByProblems() {
        const passedStatus = [Status.PASSED, Status.INCOMPLETE, Status.SKIPPED];

        return this.all().reduce((group, problem) => {
            const items = group.has(problem.file)
                ? group.get(problem.file)!
                : [];

            if (!passedStatus.includes(problem.status)) {
                items.push(problem);
            } else {
                this.problems.delete(problem.id);
            }

            group.set(problem.file, items);

            return group;
        }, new Map<string, ProblemNode[]>());
    }

    private asProblems(tests: TestEventGroup[]) {
        return tests.reduce(
            (problems: (Problem | ProblemNode)[], test: TestEventGroup) => {
                return test instanceof ProblemNode
                    ? problems.concat(test)
                    : problems.concat(this.testAsProblems(test));
            },
            []
        );
    }

    private setProblemPassed(id: string) {
        if (this.problems.has(id)) {
            const problem = this.problems.get(id)!;
            problem.status = Status.PASSED;
            this.problems.set(problem.id, problem);
        }
    }

    private testAsProblems(test: TestEventGroup): Problem[] {
        const problems: Problem[] = [];

        if (test instanceof TestSuiteNode) {
            return problems.concat(
                ...test.children.map(test => this.testAsProblems(test))
            );
        }

        return problems.concat([
            {
                type: 'problem',
                id: this.asProblemId(test),
                file: '',
                line: -1,
                message: '',
                status: Status.PASSED,
                files: [],
            },
        ]);
    }

    private asProblemId(test: TestEventGroup) {
        if (this.isNode(test)) {
            return (test as (TestSuiteNode | TestNode)).id;
        }

        const value =
            test.type === 'suite'
                ? (test as TestSuiteEvent).suite
                : (test as TestEvent).test;

        return typeof value === 'string' ? value : value.id;
    }

    private isNode(test: TestEventGroup) {
        return test instanceof TestSuiteNode || test instanceof TestNode;
    }
}
