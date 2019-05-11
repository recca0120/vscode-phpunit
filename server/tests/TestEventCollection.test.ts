import { projectPath } from './helpers';
import { TestEvent, TestSuiteEvent } from '../src/TestExplorer';
import { TestEventCollection } from './../src/TestEventCollection';
import { TestSuiteCollection } from '../src/TestSuiteCollection';

describe('TestEventCollection', () => {
    const path = projectPath('');
    const suites = new TestSuiteCollection();
    const events = new TestEventCollection();

    beforeAll(async () => {
        await suites.load(path);
    });

    it('instance', () => {
        expect(events).toBeInstanceOf(TestEventCollection);
    });

    it('put test info', async () => {
        const suite = await suites.get(projectPath('tests/AssertionsTest.php'));

        events.put(suite.children[0]);

        const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';
        expect(events.get(id)).toEqual({
            type: 'test',
            test: id,
            state: 'running',
        });
    });

    describe('put test suite info', () => {
        beforeAll(async () => {
            const suite = await suites.get(
                projectPath('tests/AssertionsTest.php')
            );

            events.put(suite);
        });

        it('get test suite event', () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
            expect(events.get(id)).toEqual({
                type: 'suite',
                suite: id,
                state: 'running',
            });
        });

        it('get test event', () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';

            expect(events.get(id)).toEqual({
                type: 'test',
                test: id,
                state: 'running',
            });
        });
    });

    describe('modify test suite info', () => {
        beforeAll(async () => {
            const suite = await suites.get(
                projectPath('tests/AssertionsTest.php')
            );

            events.put(suite);
        });

        it('modify test suite event', () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest';
            const suite = events.get(id) as TestSuiteEvent;
            suite.state = 'completed';

            expect(events.get(id)).toEqual({
                type: 'suite',
                suite: id,
                state: 'completed',
            });
        });

        it('modify test event', () => {
            const id = 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed';
            const test = events.get(id) as TestEvent;
            test.state = 'passed';
            events.put(test);

            expect(events.get(id)).toEqual({
                type: 'test',
                test: id,
                state: 'passed',
            });
        });
    });
});
