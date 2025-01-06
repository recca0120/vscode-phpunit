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
                id: 'Example (Tests\\Feature\\Example)::Example',
                testId: 'Example (Tests\\Feature\\Example)::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testFinished', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='1' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'Example (Tests\\Feature\\Example)::Example',
                testId: 'Example (Tests\\Feature\\Example)::Example',
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

        it('testSuiteStarted tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://tests/Fixtures/CollisionTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Fixtures/CollisionTest.php',
                testId: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testStarted name='error' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::error' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::error',
                testId: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinish tests/Fixtures/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testFailed name='error' message='Exception: error' details='at tests/Fixtures/CollisionTest.php:4' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='error' duration='3' flowId='68573']`, {
                event: TestResultEvent.testFailed,
                id: 'tests/Fixtures/CollisionTest.php::error',
                testId: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                message: 'Exception: error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
                details: [
                    {
                        file: 'tests/Fixtures/CollisionTest.php',
                        line: 4,
                    },
                ],
            });
        });

        it('testStarted tests/Fixtures/CollisionTest.php::success', () => {
            resultShouldBe(`##teamcity[testStarted name='success' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::success' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::success',
                testId: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/CollisionTest.php::success', () => {
            resultShouldBe(`##teamcity[testFinished name='success' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                testId: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Fixtures/CollisionTest.php',
                testId: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                testId: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 1' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                testId: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 1' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                testId: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                testId: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Fixtures/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://tests/Fixtures/ExampleTest.php' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'tests/Fixtures/ExampleTest.php',
                testId: 'tests/Fixtures/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests/Fixtures/ExampleTest.php::it example 2' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'tests/Fixtures/ExampleTest.php::it example 2',
                testId: 'tests/Fixtures/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'tests/Fixtures/ExampleTest.php::it example 2',
                testId: 'tests/Fixtures/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Unit\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest' flowId='68573']`, {
                event: TestResultEvent.testSuiteFinished,
                id: 'tests/Fixtures/ExampleTest.php',
                testId: 'tests/Fixtures/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Fixtures/ExampleTest.php',
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

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                testId: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testIgnored Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testIgnored name='Example' message='This test was ignored.' details='' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TestResultEvent.testIgnored,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                testId: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
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

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)::Example' flowId='68573']`, {
                event: TestResultEvent.testStarted,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                testId: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testFinished Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TestResultEvent.testFinished,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                testId: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
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

        it('TestSummary', () => {
            resultShouldBe('Tests:    1 failed, 1 skipped, 5 passed (5 assertions)', {
                event: TestResultEvent.testResultSummary,
                passed: 5,
                failed: 1,
                skipped: 1,
                assertions: 5,
            });
        });

        it('TestDuration', () => {
            resultShouldBe('Duration: 0.04s', {
                event: TestResultEvent.testDuration,
                text: 'Duration: 0.04s',
                time: '0.04s',
            });
        });
    });

    it('with dataset', () => {
        resultShouldBe(`##teamcity[testSuiteStarted name='Addition provider' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider' flowId='53556']`, {
            event: TestResultEvent.testSuiteStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set ""foo-bar_%$"' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"' flowId='53556']`, {
            event: TestResultEvent.testStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            name: 'Addition provider with data set ""foo-bar_%$"',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set ""foo-bar_%$"' duration='0' flowId='53556']`, {
            event: TestResultEvent.testFinished,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            name: 'Addition provider with data set ""foo-bar_%$"',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set #0' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0' flowId='53556']`, {
            event: TestResultEvent.testStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            name: 'Addition provider with data set #0',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set #0' duration='0' flowId='53556']`, {
            event: TestResultEvent.testFinished,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            name: 'Addition provider with data set #0',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set #1' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1' flowId='53556']`, {
            event: TestResultEvent.testStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            name: 'Addition provider with data set #1',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFailed name='Addition provider with data set #1' message='Failed asserting that 1 matches expected 2.' details='at tests/AssertionsTest.php:62' type='comparisonFailure' actual='1' expected='2' flowId='53556']`, undefined);

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set #1' duration='0' flowId='53556']`, {
            event: TestResultEvent.testFailed,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            name: 'Addition provider with data set #1',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testSuiteFinished name='Addition provider' flowId='53556']`, {
            event: TestResultEvent.testSuiteFinished,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            testId: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider',
            flowId: 53556,
        });
    });

    it('For Windows testStarted tests\\Fixtures\\ExampleTest.php::it example 2', () => {
        resultShouldBe(`##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests\\Fixtures\\ExampleTest.php::it example 2' flowId='68573']`, {
            event: TestResultEvent.testStarted,
            id: 'tests/Fixtures/ExampleTest.php::it example 2',
            testId: 'tests/Fixtures/ExampleTest.php::it example 2',
            name: 'it example 2',
            file: 'tests/Fixtures/ExampleTest.php',
            flowId: 68573,
        });
    });

    it('For Windows testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
        resultShouldBe(`##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`, {
            event: TestResultEvent.testFinished,
            id: 'tests/Fixtures/ExampleTest.php::it example 2',
            testId: 'tests/Fixtures/ExampleTest.php::it example 2',
            name: 'it example 2',
            file: 'tests/Fixtures/ExampleTest.php',
            flowId: 68573,
        });
    });

    describe('Pest v2', () => {
        it('testSuiteStarted phpunit.xml and locationHint prefix is file://', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`, {
                event: TestResultEvent.testSuiteStarted,
                id: pestProject('phpunit.xml'),
                testId: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                flowId: 57317,
            });
        });

        it('testSuiteStarted Test Suite and locationHint prefix is file://', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Test Suite' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Test Suite',
                testId: 'Test Suite',
                name: 'Test Suite',
                flowId: 57317,
            });
        });
    });
});
