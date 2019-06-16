import { ProblemNode, Problem, Status } from './Problem';
import { TestSuiteNode, TestNode } from './Parser';
import { TestSuiteEvent, TestEvent } from './TestExplorer';
import { Diagnostic } from 'vscode-languageserver';
import files from './Filesystem';

export declare type TestInfo =
    | ProblemNode
    | TestSuiteNode
    | TestNode
    | TestSuiteEvent
    | TestEvent;

export class ProblemCollection {
    private problems: Map<string, ProblemNode> = new Map();

    constructor(private _files = files) {}

    put(tests: TestInfo | TestInfo[]) {
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

            if (problem.status !== Status.PASSED) {
                items.push(problem);
            } else {
                this.problems.delete(problem.id);
            }

            group.set(problem.file, items);

            return group;
        }, new Map<string, ProblemNode[]>());
    }

    private asProblems(tests: TestInfo[]) {
        return tests.reduce(
            (problems: (Problem | ProblemNode)[], test: TestInfo) => {
                if (test instanceof ProblemNode) {
                    return problems.concat(test);
                }

                return problems.concat(this.testAsProblems(test));
            },
            []
        );
    }

    private testAsProblems(test: TestInfo): Problem[] {
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

    private asProblemId(test: TestInfo) {
        if (this.isNode(test)) {
            return (test as (TestSuiteNode | TestNode)).id;
        }

        const value =
            test.type === 'suite'
                ? (test as TestSuiteEvent).suite
                : (test as TestEvent).test;

        return typeof value === 'string' ? value : value.id;
    }

    private isNode(test: TestInfo) {
        return test instanceof TestSuiteNode || test instanceof TestNode;
    }
}
