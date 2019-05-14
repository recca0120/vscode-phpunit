import files from '../src/Filesystem';
import { fixturePath } from './helpers';
import { TestResponse } from '../src/TestResponse';
import { Problem, Status } from '../src/ProblemMatcher';

describe('TestResponse', () => {
    let output = '';
    let testResponse: TestResponse;

    beforeAll(async () => {
        output = await files.get(fixturePath('test-result.txt'));
        testResponse = new TestResponse(output);
    });

    it('output', () => {
        expect(testResponse.toString()).toEqual(output);
    });

    describe('problems', () => {
        let problems: Problem[];

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
