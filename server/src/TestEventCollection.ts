import { TestSuite, Test } from './Parser';
import { TestSuiteEvent, TestEvent } from './TestExplorer';

export declare type TestInfo = TestSuite | Test | TestSuiteEvent | TestEvent;

export class TestEventCollection {
    events: Map<string, TestSuiteEvent | TestEvent> = new Map();

    put(tests: TestInfo | TestInfo[]) {
        tests = tests instanceof Array ? tests : [tests];

        const events = tests.reduce((events, test) => {
            if (test instanceof TestSuite) {
                return events.concat(this.suiteAsEvents(test));
            }

            return test.type === 'suite'
                ? events.concat([this.asTestSuiteInfo(test)])
                : events.concat(this.asTestInfo(test));
        }, []);

        events.forEach(event => {
            this.events.set(event.suite || event.test, event);
        });

        return this;
    }

    get(id: string): TestSuiteEvent | TestEvent {
        return this.events.get(id);
    }

    where(filter: (test: TestSuiteEvent | TestEvent) => {}) {
        return this.all().reduce(
            (events, event) => {
                if (filter(event)) {
                    events = events.concat([event]);
                }

                return events;
            },
            [] as (TestSuiteEvent | TestEvent)[]
        );
    }

    find(id: string): TestSuiteEvent | TestEvent {
        return this.where(event => id === this.asId(event))[0];
    }

    all(): (TestSuiteEvent | TestEvent)[] {
        return Array.from(this.events.values());
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
        if (test instanceof TestSuite || test instanceof Test) {
            return test.id;
        }

        const value = test.type === 'suite' ? test.suite : test.test;

        return typeof value === 'string' ? value : value.id;
    }
}
