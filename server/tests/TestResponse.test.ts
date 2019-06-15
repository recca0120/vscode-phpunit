import files from '../src/Filesystem';
import { fixturePath } from './helpers';
import { PHPUnitOutput, ProblemMatcher } from './../src/ProblemMatcher';
import { ProblemNode, Status } from '../src/Problem';
import { TestResponse, TestResult } from '../src/TestResponse';

describe('TestResponse', () => {
    const problemMatcher: ProblemMatcher = new PHPUnitOutput();

    let testResponse: TestResponse;

    describe('PHPUnit', () => {
        it('assertion ok', () => {
            testResponse = new TestResponse(
                'OK (1 test, 1 assertion)',
                problemMatcher
            );
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(1);
            expect(result.assertions).toEqual(1);
        });

        it('assertions ok', () => {
            testResponse = new TestResponse(
                'OK (2 tests, 2 assertions)',
                problemMatcher
            );
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(2);
            expect(result.assertions).toEqual(2);
        });

        it('assertions has errors', () => {
            testResponse = new TestResponse(
                `ERRORS!
Test: 20, Assertions: 14, Errors: 2, Failures: 4, Warnings: 2, Skipped: 1, Incomplete: 1, Risky: 2.`,
                problemMatcher
            );
            const result: TestResult = testResponse.getTestResult();

            expect(result).toEqual({
                tests: 20,
                assertions: 14,
                errors: 2,
                failures: 4,
                warnings: 2,
                skipped: 1,
                incomplete: 1,
                risky: 2,
            });
        });

        it('no tests executed', () => {
            testResponse = new TestResponse(
                'No tests executed!',
                problemMatcher
            );
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(0);
        });

        it('OK, but incomplete, skipped, or risky tests!', () => {
            testResponse = new TestResponse(
                `OK, but incomplete, skipped, or risky tests!
Tests: 3, Assertions: 2, Skipped: 1.
                `,
                problemMatcher
            );
            const result: TestResult = testResponse.getTestResult();

            expect(result).toMatchObject({
                tests: 3,
                assertions: 2,
                skipped: 1,
            });
        });
    });

    describe('problems', () => {
        let output = '';
        let problems: ProblemNode[];

        beforeAll(async () => {
            output = await files.get(fixturePath('test-result.txt'));
            testResponse = new TestResponse(output, problemMatcher);
        });

        it('output', () => {
            expect(testResponse.toString()).toEqual(output);
        });

        it('test_sum_item_method_not_call', async () => {
            problems = await testResponse.asProblems();
            expect(problems[0]).toMatchObject({
                type: 'problem',
                id:
                    'Recca0120\\VSCode\\Tests\\CalculatorTest::test_sum_item_method_not_call',
                namespace: 'Recca0120\\VSCode\\Tests',
                class: 'CalculatorTest',
                method: 'test_sum_item_method_not_call',
                file: '',
                line: jasmine.any(Number),
                status: Status.FAILURE,
                message: jasmine.any(String),
                files: jasmine.anything(),
            });
        });
    });
});
