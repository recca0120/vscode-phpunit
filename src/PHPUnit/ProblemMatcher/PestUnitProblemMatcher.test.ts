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
        it('testSuiteStarted group', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TestResultEvent.testSuiteStarted,
                id: 'Tests\\Feature\\Example',
                testId: 'Tests\\Feature\\Example',
                flowId: 68573,
            });
        });
    });

    `

##teamcity[testCount count='7' flowId='68573']
##teamcity[testSuiteStarted name='Test Suite' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']
##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Feature\\Example)::Example' flowId='68573']
##teamcity[testFinished name='Example' duration='1' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Unit\\CollisionTest' locationHint='pest_qn://tests/Unit/CollisionTest.php' flowId='68573']
##teamcity[testStarted name='error' locationHint='pest_qn://tests/Unit/CollisionTest.php::error' flowId='68573']
##teamcity[testFailed name='error' message='Exception: error' details='at tests/Unit/CollisionTest.php:4' flowId='68573']
##teamcity[testFinished name='error' duration='3' flowId='68573']
##teamcity[testStarted name='success' locationHint='pest_qn://tests/Unit/CollisionTest.php::success' flowId='68573']
##teamcity[testFinished name='success' duration='0' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Unit\\CollisionTest' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Unit\\DirectoryWithTests\\ExampleTest' locationHint='pest_qn://tests/Unit/DirectoryWithTests/ExampleTest.php' flowId='68573']
##teamcity[testStarted name='it example 1' locationHint='pest_qn://tests/Unit/DirectoryWithTests/ExampleTest.php::it example 1' flowId='68573']
##teamcity[testFinished name='it example 1' duration='0' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Unit\\DirectoryWithTests\\ExampleTest' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://tests/Unit/ExampleTest.php' flowId='68573']
##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests/Unit/ExampleTest.php::it example 2' flowId='68573']
##teamcity[testFinished name='it example 2' duration='0' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)' flowId='68573']
##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example' flowId='68573']
##teamcity[testIgnored name='Example' message='This test was ignored.' details='' flowId='68573']
##teamcity[testFinished name='Example' duration='0' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' flowId='68573']
##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)' flowId='68573']
##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)::Example' flowId='68573']
##teamcity[testFinished name='Example' duration='0' flowId='68573']
##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\ExampleTest' flowId='68573']
##teamcity[testSuiteFinished name='Test Suite' flowId='68573']
##teamcity[testSuiteFinished name='${pestProject('phpunit.xml')}' flowId='68573']

  Tests:    1 failed, 1 skipped, 5 passed (5 assertions)
  Duration: 0.04s
    `;
});
