import files from '../src/Filesystem';
import { fixturePath, projectPath } from './helpers';
import { OutputProblemMatcher } from '../src/OutputProblemMatcher';
import { ProblemNode } from '../src/ProblemNode';
import { TestEvent, TestSuiteEvent } from '../src/TestExplorer';
import { TestEventCollection } from '../src/TestEventCollection';
import { TestSuiteCollection } from '../src/TestSuiteCollection';

describe('TestEventCollection', () => {
    const cwd = projectPath('').fsPath;
    const pattern = 'tests/**/*.php';
    const suites = new TestSuiteCollection();
    const events = new TestEventCollection();

    beforeAll(async () => {
        await suites.load(pattern, { cwd: cwd });
    });

    it('instance', () => {
        expect(events).toBeInstanceOf(TestEventCollection);
    });

    it('put test info', async () => {
        const suite = suites.get(projectPath('tests/AssertionsTest.php'));

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
            const suite = suites.get(projectPath('tests/AssertionsTest.php'));

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
            const suite = suites.get(projectPath('tests/AssertionsTest.php'));

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

    describe('put problems', () => {
        let problems: ProblemNode[];

        function findProblem(id: string) {
            return problems.filter(problem => problem.id === id)[0];
        }

        beforeAll(async () => {
            problems = await new OutputProblemMatcher().parse(
                await files.get(fixturePath('test-result.txt'))
            );
        });

        it('put problem', () => {
            const id =
                'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider';
            const problem = findProblem(id);

            events.put(problem);

            expect(events.get(id)).toEqual(
                jasmine.objectContaining({
                    type: 'test',
                    test: id,
                    state: 'failed',
                })
            );
        });
    });
});
