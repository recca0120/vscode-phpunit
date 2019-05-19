import files from '../src/Filesystem';
import { fixturePath } from './helpers';
import { TestResponse, TestResult } from '../src/TestResponse';
import { Problem, Status } from '../src/ProblemMatcher';

describe('TestResponse', () => {
    let testResponse: TestResponse;

    describe('PHPUnit', () => {
        it('assertion ok', () => {
            testResponse = new TestResponse('OK (1 test, 1 assertion)');
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(1);
            expect(result.assertions).toEqual(1);
        });

        it('assertions ok', () => {
            testResponse = new TestResponse('OK (2 test, 2 assertion)');
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(2);
            expect(result.assertions).toEqual(2);
        });

        it('assertions as errors', () => {
            testResponse = new TestResponse(`ERRORS!
Test: 20, Assertions: 14, Errors: 2, Failures: 4, Warnings: 2, Skipped: 1, Incomplete: 1, Risky: 2.`);
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
            testResponse = new TestResponse('No tests executed!');
            const result: TestResult = testResponse.getTestResult();

            expect(result.tests).toEqual(0);
        });
    });

    describe('problems', () => {
        let output = '';
        let problems: Problem[];

        beforeAll(async () => {
            output = await files.get(fixturePath('test-result.txt'));
            testResponse = new TestResponse(output);
        });

        it('output', () => {
            expect(testResponse.toString()).toEqual(output);
        });

        beforeAll(async () => {
            problems = await testResponse.asProblem();
        });

        it('test_sum_item_method_not_call', () => {
            expect(problems[0]).toEqual({
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

    // beforeAll(async () => {
    //     testResponse = new TestResponse(output);
    // });
    // describe('Diagnostic', () => {
    //     let diagnosticGroup: Map<string, Diagnostic[]>;
    //     const expectedDiagnostic = () => {
    //         return jasmine.objectContaining({
    //             message: jasmine.any(String),
    //             range: {
    //                 end: {
    //                     character: jasmine.any(Number),
    //                     line: jasmine.any(Number),
    //                 },
    //                 start: {
    //                     character: jasmine.any(Number),
    //                     line: jasmine.any(Number),
    //                 },
    //             },
    //             relatedInformation: jasmine.anything(),
    //             severity: DiagnosticSeverity.Error,
    //             source: 'PHPUnit',
    //         });
    //     };
    //     beforeAll(async () => {
    //         diagnosticGroup = await testResponse.asDiagnosticGroup();
    //     });
    //     it('Recca0120\\VSCode\\Tests\\CalculatorTest', () => {
    //         const diagnostics: Diagnostic[] = diagnosticGroup.get(
    //             projectPath('tests/CalculatorTest.php').toString()
    //         );
    //         expect(diagnostics).toEqual([
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //         ]);
    //     });
    //     it('Recca0120\\VSCode\\Tests\\AssertionsTest', () => {
    //         const diagnostics: Diagnostic[] = diagnosticGroup.get(
    //             projectPath('tests/AssertionsTest.php').toString()
    //         );
    //         expect(diagnostics).toEqual([
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //             expectedDiagnostic(),
    //         ]);
    //     });
    // });
});
