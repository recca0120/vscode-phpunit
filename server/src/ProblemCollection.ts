import files from './Filesystem';
import { Diagnostic } from 'vscode-languageserver';
import { Problem, ProblemNode, Status } from './ProblemNode';
import { TestEvent, TestSuiteEvent } from './TestExplorer';
import { TestNode, TestSuiteNode } from './TestNode';
import { TestEventGroup } from './TestEventCollection';

export class ProblemCollection {
    private problems: Map<string, ProblemNode> = new Map();

    constructor(private _files = files) {}

    put(tests: TestEventGroup | TestEventGroup[]) {
        const problems = this.asProblems(
            tests instanceof Array ? tests : [tests]
        );

        problems.forEach(problem => {
            if (problem instanceof ProblemNode) {
                this.problems.set(problem.id, problem);

                return;
            }

            if (this.problems.has(problem.id)) {
                const oldProblem = this.problems.get(problem.id)!;
                oldProblem.status = Status.PASSED;
                this.problems.set(oldProblem.id, oldProblem);
            }
        });

        return this;
    }

    all(): ProblemNode[] {
        return Array.from(this.problems.values());
    }

    async asDiagnosticGroup() {
        const problemGroups = this.groupByProblems();

        const groups = new Map<string, Diagnostic[]>();
        for (const [file, problems] of problemGroups) {
            const uri = this._files.asUri(file).toString();
            const diagnostics =
                problems.length === 0
                    ? []
                    : await Promise.all(
                          problems.map(problem => problem.asDiagnostic())
                      );

            groups.set(uri, diagnostics);
        }

        return groups;
    }

    private groupByProblems() {
        return this.all().reduce((group, problem) => {
            const items = group.has(problem.file)
                ? group.get(problem.file)!
                : [];

            if (
                [Status.PASSED, Status.INCOMPLETE, Status.SKIPPED].includes(
                    problem.status
                )
            ) {
                this.problems.delete(problem.id);
            } else {
                items.push(problem);
            }

            group.set(problem.file, items);

            return group;
        }, new Map<string, ProblemNode[]>());
    }

    private asProblems(tests: TestEventGroup[]) {
        return tests.reduce(
            (problems: (Problem | ProblemNode)[], test: TestEventGroup) => {
                if (test instanceof ProblemNode) {
                    return problems.concat(test);
                }

                return problems.concat(this.testAsProblems(test));
            },
            []
        );
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
