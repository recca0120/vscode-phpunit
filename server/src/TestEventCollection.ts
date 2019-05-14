import { Problem, Status } from './ProblemMatcher';
import { Test, TestSuite } from './Parser';
import { TestEvent, TestSuiteEvent } from './TestExplorer';

export declare type TestInfo =
    | TestSuite
    | Test
    | TestSuiteEvent
    | TestEvent
    | Problem;

export class TestEventCollection {
    private states: Map<Status, TestEvent['state']> = new Map([
        [Status.UNKNOWN, 'errored'],
        [Status.PASSED, 'passed'],
        [Status.SKIPPED, 'skipped'],
        [Status.INCOMPLETE, 'skipped'],
        [Status.FAILURE, 'failed'],
        [Status.ERROR, 'errored'],
        [Status.RISKY, 'failed'],
        [Status.WARNING, 'failed'],
    ]);
    events: Map<string, TestSuiteEvent | TestEvent> = new Map();

    put(tests: TestInfo | TestInfo[]) {
        tests = tests instanceof Array ? tests : [tests];

        const events = tests.reduce((events, test) => {
            if (test instanceof TestSuite) {
                return events.concat(this.suiteAsEvents(test));
            }

            if (test.type === 'problem') {
                return events.concat([this.problemAsEvent(test)]);
            }

            return test.type === 'suite'
                ? events.concat([this.asTestSuiteInfo(test)])
                : events.concat(this.asTestInfo(test));
        }, []);

        events.forEach(event => {
            this.events.set(this.asId(event), event);
        });

        return this;
    }

    get(id: string): TestSuiteEvent | TestEvent {
        return this.events.get(id);
    }

    where(filter: (test: TestSuiteEvent | TestEvent) => {}, single = false) {
        const events = this.all();
        const items: (TestSuiteEvent | TestEvent)[] = [];

        for (const event of events) {
            if (filter(event)) {
                items.push(event);

                if (single === true) {
                    return items;
                }
            }
        }

        return items;
    }

    find(id: string): TestSuiteEvent | TestEvent {
        return this.where(event => id === this.asId(event))[0];
    }

    all(): (TestSuiteEvent | TestEvent)[] {
        return Array.from(this.events.values());
    }

    private problemAsEvent(problem: Problem): TestEvent {
        return {
            type: 'test',
            test: problem.id,
            state: this.states.get(problem.status),
            message: problem.message,
            decorations: this.asTestDecorations(problem),
        };
    }

    private asTestDecorations(problem: Problem) {
        const current = { file: problem.file, line: problem.line };

        return [current]
            .concat(problem.files)
            .filter(
                location => location.file === problem.file && location.line > 0
            )
            .map(location => ({
                line: location.line - 1,
                message: problem.message,
            }));
    }

    private suiteAsEvents(
        test: TestSuite | Test
    ): (TestSuiteEvent | TestEvent)[] {
        const events: any = [];

        if (test instanceof TestSuite) {
            return events
                .concat([this.asTestSuiteInfo(test)])
                .concat(...test.children.map(test => this.suiteAsEvents(test)));
        }

        return events.concat([this.asTestInfo(test)]);
    }

    private asTestSuiteInfo(suite: TestSuite | TestSuiteEvent): TestSuiteEvent {
        if (suite instanceof TestSuite) {
            return {
                type: 'suite',
                suite: this.asId(suite),
                state: 'running',
            };
        }

        return Object.assign({}, suite, {
            suite: this.asId(suite),
        });
    }

    private asTestInfo(test: Test | TestEvent): TestEvent {
        if (test instanceof Test) {
            return {
                type: 'test',
                test: this.asId(test),
                state: 'running',
            };
        }

        return Object.assign({}, test, {
            test: this.asId(test),
        });
    }

    private asId(test: TestSuite | TestInfo) {
        if (
            test instanceof TestSuite ||
            test instanceof Test ||
            test.type === 'problem'
        ) {
            return test.id;
        }

        const value = test.type === 'suite' ? test.suite : test.test;

        return typeof value === 'string' ? value : value.id;
    }
}
