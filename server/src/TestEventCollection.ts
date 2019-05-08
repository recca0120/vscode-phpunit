import { TestSuite, Test } from './Parser';
import { TestSuiteEvent, TestEvent } from './TestExplorer';

export declare type StoreType = TestSuiteEvent | TestEvent | TestSuite | Test;

export class TestEventCollection {
    events: (TestSuiteEvent | TestEvent)[] = [];

    put(events: (StoreType)[] | (StoreType)) {
        events = events instanceof Array ? events : [events];

        return this.putEvent(
            events.reduce((events, event) => {
                if (event instanceof TestSuite || event instanceof Test) {
                    return events.concat(this.putTest(event));
                }

                events.push(event);

                return events;
            }, [])
        );
    }

    all() {
        return this.events;
    }

    private putTest(test: TestSuite | Test) {
        const events: (TestSuiteEvent | TestEvent)[] = [];

        if (test instanceof Test) {
            events.push({
                type: 'test',
                test: test,
                state: 'running',
            } as TestEvent);

            return events;
        }

        events.push({
            type: 'suite',
            suite: test,
            state: 'running',
        } as TestSuiteEvent);

        // events.push(
        //     ...test.children.reduce((events, child) => {
        //         return events.concat(this.putTest(child));
        //     }, [])
        // );

        return events;
    }

    private putEvent(events: (TestSuiteEvent | TestEvent)[]) {
        const keys = this.getKeys(events);
        this.events = this.events
            .filter(event => {
                return keys.includes(
                    event.type === 'suite' ? event.suite : event.test
                );
            })
            .concat(events);

        return this;
    }

    private getKeys(events: (TestSuiteEvent | TestEvent)[]) {
        return events.map(event =>
            event.type === 'suite' ? event.suite : event.test
        );
    }
}
