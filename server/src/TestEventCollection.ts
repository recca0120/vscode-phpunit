import { ProblemNode } from './ProblemNode';
import { TestEvent, TestSuiteEvent } from './TestExplorer';
import { TestNode, TestSuiteNode } from './TestNode';

export declare type NodeGroup = TestSuiteNode | TestNode | ProblemNode;
export declare type TestEventGroup = NodeGroup | TestSuiteEvent | TestEvent;

export class TestEventCollection {
    private events: Map<string, TestSuiteEvent | TestEvent> = new Map();

    put(tests: TestEventGroup | TestEventGroup[]) {
        tests = tests instanceof Array ? tests : [tests];

        this.asEvents(tests).forEach(event =>
            this.events.set(this.asEventId(event), event)
        );

        return this;
    }

    get(id: string): TestSuiteEvent | TestEvent | undefined {
        return this.events.get(id);
    }

    delete(test: TestEventGroup | TestEventGroup) {
        return this.events.delete(this.asEventId(test));
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
        return this.where(event => id === this.asEventId(event))[0];
    }

    all(): (TestSuiteEvent | TestEvent)[] {
        return Array.from(this.events.values());
    }

    private asEvents(tests: TestEventGroup[]) {
        return tests.reduce(
            (events: (TestSuiteEvent | TestEvent)[], test: TestEventGroup) => {
                return this.isNode(test)
                    ? events.concat(this.nodeAsEvents(test as NodeGroup))
                    : events.concat([test as (TestSuiteEvent | TestEvent)]);
            },
            []
        );
    }

    private nodeAsEvents(test: NodeGroup): (TestSuiteEvent | TestEvent)[] {
        const events: (TestSuiteEvent | TestEvent)[] = [];

        return test instanceof TestSuiteNode
            ? events
                  .concat([test.asTestSuiteEvent()])
                  .concat(...test.children.map(test => this.nodeAsEvents(test)))
            : events.concat([test.asTestEvent()]);
    }

    private asEventId(test: TestEventGroup) {
        if (this.isNode(test)) {
            return (test as NodeGroup).id;
        }

        const value =
            test.type === 'suite'
                ? (test as TestSuiteEvent).suite
                : (test as TestEvent).test;

        return typeof value === 'string' ? value : value.id;
    }

    private isNode(test: TestEventGroup) {
        return (
            test instanceof TestSuiteNode ||
            test instanceof TestNode ||
            test instanceof ProblemNode
        );
    }
}
