import { parse } from 'fast-xml-parser';
import { files } from '../../src/filesystem';
import { JUnit, Test, Type } from '../../src/phpunit';
import { resolve } from 'path';

describe('JUnit Test', () => {
    const jUnit: JUnit = new JUnit();
    const projectPath = (p: string) => resolve(__dirname, '../fixtures/project', p.replace(/\\/g, '/'));
    const path = projectPath('tests/AssertionsTest.php');
    const path2 = projectPath('tests/CalculatorTest.php');
    let tests: Test[] = [];

    beforeEach(async () => {
        const content: string = await files.get(projectPath('junit.xml'));
        tests = await jUnit.parse(
            content.replace(
                /C:\\Users\\recca\\Desktop\\vscode-phpunit\\server\\tests\\fixtures\\project\\(.+\.php)?/g,
                (...m) => {
                    return projectPath(m[1]);
                }
            )
        );
    });

    it('test_passed', () => {
        expect(tests[0]).toEqual({
            name: 'test_passed',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 9,
            time: 0.007537,
            type: Type.PASSED,
        });
    });

    it('test_error', () => {
        expect(tests[1]).toEqual({
            name: 'test_error',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 16,
            time: 0.001508,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message: 'Failed asserting that false is true.',
                details: [],
            },
        });
    });

    it('test_assertion_isnt_same', () => {
        expect(tests[2]).toEqual({
            name: 'test_assertion_isnt_same',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 21,
            time: 0.001332,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message:
                    "Failed asserting that two arrays are identical.\n--- Expected\n+++ Actual\n@@ @@\n Array &0 (\n-    'a' => 'b'\n-    'c' => 'd'\n+    'e' => 'f'\n+    0 => 'g'\n+    1 => 'h'\n )",
                details: [],
            },
        });
    });

    it('test_risky', () => {
        expect(tests[3]).toEqual({
            name: 'test_risky',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 24,
            time: 0.000079,
            type: Type.RISKY,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: 'Risky Test',
                details: [],
            },
        });
    });

    it('it_should_be_annotation_test', () => {
        expect(tests[4]).toEqual({
            name: 'it_should_be_annotation_test',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 32,
            time: 0.000063,
            type: Type.PASSED,
        });
    });

    it('test_skipped', () => {
        expect(tests[5]).toEqual({
            name: 'test_skipped',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 37,
            time: 0.000664,
            type: Type.SKIPPED,
            fault: {
                details: [],
                message: '',
                type: 'skipped',
            },
        });
    });

    it('test_incomplete', () => {
        expect(tests[6]).toEqual({
            name: 'test_incomplete',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 42,
            time: 0.000693,
            type: Type.SKIPPED,
            fault: {
                details: [],
                message: '',
                type: 'skipped',
            },
        });
    });

    it('test_no_assertion', () => {
        expect(tests[7]).toEqual({
            name: 'test_no_assertion',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            file: path,
            line: 47,
            time: 0.000047,
            type: Type.RISKY,
            fault: {
                details: [],
                message: 'Risky Test',
                type: 'PHPUnit\\Framework\\RiskyTestError',
            },
        });
    });

    it('test_sum', () => {
        expect(tests[8]).toEqual({
            name: 'test_sum',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            file: path2,
            line: 18,
            time: 0.00197,
            type: Type.PASSED,
        });
    });

    it('test_sum_fail', () => {
        expect(tests[9]).toEqual({
            name: 'test_sum_fail',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            file: path2,
            line: 29,
            time: 0.000132,
            type: Type.FAILURE,
            fault: {
                details: [],
                message: 'Failed asserting that 4 is identical to 3.',
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
            },
        });
    });

    it('test_sum_item', () => {
        expect(tests[10]).toEqual({
            name: 'test_sum_item',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            file: path2,
            line: 32,
            time: 0.000608,
            type: Type.PASSED,
        });
    });

    it('test_sum_item_method_not_call', () => {
        expect(tests[11]).toEqual({
            name: 'test_sum_item_method_not_call',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            file: path2,
            line: 15,
            time: 0.027106,
            type: Type.ERROR,
            fault: {
                details: [
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php'),
                        line: 38,
                    },
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery/Expectation.php'),
                        line: 309,
                    },
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php'),
                        line: 119,
                    },
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery/Container.php'),
                        line: 301,
                    },
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery/Container.php'),
                        line: 286,
                    },
                    {
                        file: projectPath('vendor/mockery/mockery/library/Mockery.php'),
                        line: 165,
                    },
                ],
                message:
                    'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                type: 'Mockery\\Exception\\InvalidCountException',
            },
        });
    });
});
