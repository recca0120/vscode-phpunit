import { pestProject } from '../__tests__/utils';
import { ProblemMatcher } from './ProblemMatcher';
import { TestResultEvent } from './types';

const problemMatcher = new ProblemMatcher();

describe('Pest ProblemMatcher Text', () => {
    const resultShouldBe = (content: string, expected: any) => {
        const actual = problemMatcher.parse(content);

        if (expected === undefined) {
            expect(actual).toBeUndefined();
        } else {
            expect(actual).toEqual(expect.objectContaining(expected));
        }
    };

    describe('Teamcity Life Cycle', () => {
        it('testSuiteStarted phpunit.xml', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: pestProject('phpunit.xml'),
                testId: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                flowId: 68573,
            });
        });

        it('testCount', () => {
            resultShouldBe(`##teamcity[testCount count='7' flowId='68573']`, {
                event: TestResultEvent.testCount,
                count: 7,
                flowId: 68573,
            });
        });

        it('testSuiteStarted Test Suite', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Test Suite' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Test Suite',
                testId: 'Test Suite',
                name: 'Test Suite',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Feature\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Tests\\Feature\\ExampleTest',
                testId: 'Tests\\Feature\\ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 68573,
            });
        });

        it('testStarted', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Feature\\Example)::Example' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'Tests\\Feature\\Example::Example',
                testId: 'Tests\\Feature\\Example::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testFinished', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='1' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'Tests\\Feature\\Example::Example',
                testId: 'Tests\\Feature\\Example::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Feature\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'Tests\\Feature\\ExampleTest',
                testId: 'Tests\\Feature\\ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Unit/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\CollisionTest' locationHint='pest_qn://tests/Unit/CollisionTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Unit/CollisionTest.php',
                testId: 'tests/Unit/CollisionTest.php',
                name: 'Tests\\Unit\\CollisionTest',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Unit/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testStarted name='error' locationHint='pest_qn://tests/Unit/CollisionTest.php::error' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Unit/CollisionTest.php::error',
                testId: 'tests/Unit/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinish tests/Unit/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testFailed name='error' message='Exception: error' details='at tests/Unit/CollisionTest.php:4' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='error' duration='3' flowId='68573']`, {
                event: TestResultEvent.testFailed,
                id: 'tests/Unit/CollisionTest.php::error',
                testId: 'tests/Unit/CollisionTest.php::error',
                name: 'error',
                message: 'Exception: error',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Unit/CollisionTest.php::success', () => {
            resultShouldBe(`##teamcity[testStarted name='success' locationHint='pest_qn://tests/Unit/CollisionTest.php::success' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Unit/CollisionTest.php::success',
                testId: 'tests/Unit/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Unit/CollisionTest.php::success', () => {
            resultShouldBe(`##teamcity[testFinished name='success' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Unit/CollisionTest.php::success',
                testId: 'tests/Unit/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Unit/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\CollisionTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Unit/CollisionTest.php',
                testId: 'tests/Unit/CollisionTest.php',
                name: 'Tests\\Unit\\CollisionTest',
                file: 'tests/Unit/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Unit/DirectoryWithTests/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\DirectoryWithTests\\ExampleTest' locationHint='pest_qn://tests/Unit/DirectoryWithTests/ExampleTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                testId: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Unit\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 1' locationHint='pest_qn://tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1',
                testId: 'tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 1' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1',
                testId: 'tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Unit/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\DirectoryWithTests\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                testId: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Unit\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Unit/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Unit/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://tests/Unit/ExampleTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Unit/ExampleTest.php',
                testId: 'tests/Unit/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Unit/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests/Unit/ExampleTest.php::it example 2' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Unit/ExampleTest.php::it example 2',
                testId: 'tests/Unit/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Unit/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Unit/ExampleTest.php::it example 2',
                testId: 'tests/Unit/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Unit\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Unit/ExampleTest.php',
                testId: 'tests/Unit/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                testId: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testStarted Tests\\Fixtures\\Inheritance\\Base\\Example::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\Example::Example',
                testId: 'Tests\\Fixtures\\Inheritance\\Base\\Example::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testIgnored Tests\\Fixtures\\Inheritance\\Base\\Example::Example', () => {
            resultShouldBe(`##teamcity[testIgnored name='Example' message='This test was ignored.' details='' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TestResultEvent.testIgnored,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\Example::Example',
                testId: 'Tests\\Fixtures\\Inheritance\\Base\\Example::Example',
                name: 'Example',
                message: 'This test was ignored.',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                testId: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testStarted Tests\\Fixtures\\Inheritance\\Example::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)::Example' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'Tests\\Fixtures\\Inheritance\\Example::Example',
                testId: 'Tests\\Fixtures\\Inheritance\\Example::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testStarted Tests\\Fixtures\\Inheritance\\Example::Example', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'Tests\\Fixtures\\Inheritance\\Example::Example',
                testId: 'Tests\\Fixtures\\Inheritance\\Example::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                testId: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Test Suite', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Test Suite' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'Test Suite',
                testId: 'Test Suite',
                name: 'Test Suite',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished phpunit.xml', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='${pestProject('phpunit.xml')}' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: pestProject('phpunit.xml'),
                testId: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                file: '',
                flowId: 68573,
            });
        });

        xit('TestSummary', () => {
            resultShouldBe('Tests:    1 failed, 1 skipped, 5 passed (5 assertions) ', {
                tests: 1,
                failed: 1,
                skipped: 1,
                assertions: 5,
            });

            `Duration: 0.04s`;
        });
    });

});
