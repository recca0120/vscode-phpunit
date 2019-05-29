import { ProblemNode } from './ProblemMatcher';
import { TestEvent, TestSuiteEvent } from './TestExplorer';
import { TestNode, TestSuiteNode } from './Parser';

export declare type Node = TestSuiteNode | TestNode | ProblemNode;

export declare type TestInfo = Node | TestSuiteEvent | TestEvent;

export class TestEventCollection {
    private events: Map<string, TestSuiteEvent | TestEvent> = new Map();

    put(tests: TestInfo | TestInfo[]) {
        tests = tests instanceof Array ? tests : [tests];

        this.asEvents(tests).forEach(event =>
            this.events.set(this.asId(event), event)
        );

        return this;
    }

    get(id: string): TestSuiteEvent | TestEvent | undefined {
        return this.events.get(id);
    }

    delete(test: TestInfo | TestInfo) {
        return this.events.delete(this.asId(test));
    }

    clear() {
        this.events.clear();

        return this;
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

    private asEvents(tests: TestInfo[]) {
        return tests.reduce(
            (events: (TestSuiteEvent | TestEvent)[], test: TestInfo) => {
                if (this.isNode(test)) {
                    return events.concat(this.nodeAsEvents(test as Node));
                }

                return events.concat([test as (TestSuiteEvent | TestEvent)]);
            },
            []
        );
    }

    private nodeAsEvents(test: Node): (TestSuiteEvent | TestEvent)[] {
        const events: (TestSuiteEvent | TestEvent)[] = [];

        if (test instanceof TestSuiteNode) {
            return events
                .concat([test.asTestSuiteEvent()])
                .concat(...test.children.map(test => this.nodeAsEvents(test)));
        }

        return events.concat([test.asTestEvent()]);
    }

    private asId(test: TestInfo) {
        if (this.isNode(test)) {
            return (test as Node).id;
        }

        const value =
            test.type === 'suite'
                ? (test as TestSuiteEvent).suite
                : (test as TestEvent).test;

        return typeof value === 'string' ? value : value.id;
    }

    private isNode(test: TestInfo) {
        return (
            test instanceof TestSuiteNode ||
            test instanceof TestNode ||
            test instanceof ProblemNode
        );
    }
}
