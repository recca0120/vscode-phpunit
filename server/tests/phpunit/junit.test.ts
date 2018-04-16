import { Filesystem } from '../../src/filesystem';
import { JUnit, Test, Type } from '../../src/phpunit';
import { parse } from 'fast-xml-parser';
import { pathPattern, projectPath } from './../helpers';
import { resolve } from 'path';

describe('JUnit Test', () => {
    const files = new Filesystem();
    const jUnit: JUnit = new JUnit(files);
    const path = projectPath('tests/AssertionsTest.php');
    const path2 = projectPath('tests/CalculatorTest.php');
    let content: string = '';
    let tests: Test[] = [];

    beforeAll(async () => {
        const jUnitFile: string = projectPath('junit.xml');
        content = await files.get(jUnitFile);
        content = content.replace(pathPattern, (...m) => {
            return projectPath(m[1]);
        });
        spyOn(files, 'get').and.returnValue(content);
        tests = await jUnit.parseFile(jUnitFile);
    });

    it('test_passed', () => {
        expect(tests[0]).toEqual({
            name: 'test_passed',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(path),
            range: {
                end: {
                    character: 33,
                    line: 8,
                },
                start: {
                    character: 4,
                    line: 8,
                },
            },
            time: 0.007537,
            type: Type.PASSED,
        });
    });

    it('test_error', () => {
        expect(tests[1]).toEqual({
            name: 'test_error',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(path),
            range: {
                end: {
                    character: 33,
                    line: 15,
                },
                start: {
                    character: 8,
                    line: 15,
                },
            },
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
            uri: files.uri(path),
            range: {
                end: {
                    character: 76,
                    line: 20,
                },
                start: {
                    character: 8,
                    line: 20,
                },
            },
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
            uri: files.uri(path),
            range: {
                end: {
                    character: 32,
                    line: 23,
                },
                start: {
                    character: 4,
                    line: 23,
                },
            },
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
            uri: files.uri(path),
            range: {
                end: {
                    character: 50,
                    line: 31,
                },
                start: {
                    character: 4,
                    line: 31,
                },
            },
            time: 0.000063,
            type: Type.PASSED,
        });
    });

    it('test_skipped', () => {
        expect(tests[5]).toEqual({
            name: 'test_skipped',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(path),
            range: {
                end: {
                    character: 34,
                    line: 36,
                },
                start: {
                    character: 4,
                    line: 36,
                },
            },
            time: 0.000664,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: 'Skipped Test',
                details: [],
            },
        });
    });

    it('test_incomplete', () => {
        expect(tests[6]).toEqual({
            name: 'test_incomplete',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(path),
            range: {
                end: {
                    character: 37,
                    line: 41,
                },
                start: {
                    character: 4,
                    line: 41,
                },
            },
            time: 0.000693,
            type: Type.SKIPPED,
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: 'Skipped Test',
                details: [],
            },
        });
    });

    it('test_no_assertion', () => {
        expect(tests[7]).toEqual({
            name: 'test_no_assertion',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(path),
            range: {
                end: {
                    character: 39,
                    line: 46,
                },
                start: {
                    character: 4,
                    line: 46,
                },
            },
            time: 0.000047,
            type: Type.RISKY,
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: 'Risky Test',
                details: [],
            },
        });
    });

    it('test_sum', () => {
        expect(tests[8]).toEqual({
            name: 'test_sum',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(path2),
            range: {
                end: {
                    character: 30,
                    line: 17,
                },
                start: {
                    character: 4,
                    line: 17,
                },
            },
            time: 0.00197,
            type: Type.PASSED,
        });
    });

    it('test_sum_fail', () => {
        expect(tests[9]).toEqual({
            name: 'test_sum_fail',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(path2),
            range: {
                end: {
                    character: 53,
                    line: 28,
                },
                start: {
                    character: 8,
                    line: 28,
                },
            },
            time: 0.000132,
            type: Type.FAILURE,
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message: 'Failed asserting that 4 is identical to 3.',
                details: [],
            },
        });
    });

    it('test_sum_item', () => {
        expect(tests[10]).toEqual({
            name: 'test_sum_item',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(path2),
            range: {
                end: {
                    character: 35,
                    line: 31,
                },
                start: {
                    character: 4,
                    line: 31,
                },
            },
            time: 0.000608,
            type: Type.PASSED,
        });
    });

    it('test_sum_item_method_not_call', () => {
        expect(tests[11]).toEqual({
            name: 'test_sum_item_method_not_call',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath(path2)),
            range: {
                end: {
                    character: 19,
                    line: 14,
                },
                start: {
                    character: 8,
                    line: 14,
                },
            },
            time: 0.027106,
            type: Type.ERROR,
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message:
                    'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                details: [
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php')),
                        range: {
                            end: {
                                character: 69,
                                line: 37,
                            },
                            start: {
                                character: 12,
                                line: 37,
                            },
                        },
                    },
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery/Expectation.php')),
                        range: {
                            end: {
                                character: 54,
                                line: 308,
                            },
                            start: {
                                character: 12,
                                line: 308,
                            },
                        },
                    },
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php')),
                        range: {
                            end: {
                                character: 31,
                                line: 118,
                            },
                            start: {
                                character: 16,
                                line: 118,
                            },
                        },
                    },
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery/Container.php')),
                        range: {
                            end: {
                                character: 36,
                                line: 300,
                            },
                            start: {
                                character: 12,
                                line: 300,
                            },
                        },
                    },
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery/Container.php')),
                        range: {
                            end: {
                                character: 36,
                                line: 285,
                            },
                            start: {
                                character: 12,
                                line: 285,
                            },
                        },
                    },
                    {
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery.php')),
                        range: {
                            end: {
                                character: 39,
                                line: 164,
                            },
                            start: {
                                character: 8,
                                line: 164,
                            },
                        },
                    },
                ],
            },
        });
    });

    it('test_sum_item', () => {
        expect(tests[12]).toEqual({
            name: 'test_throw_exception',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath(path2)),
            range: {
                end: {
                    character: 38,
                    line: 56,
                },
                start: {
                    character: 8,
                    line: 56,
                },
            },
            time: 0.000157,
            type: Type.ERROR,
            fault: {
                type: 'Exception',
                message: 'Exception:',
                details: [
                    {
                        uri: files.uri(projectPath('src/Calculator.php')),
                        range: {
                            end: {
                                character: 28,
                                line: 20,
                            },
                            start: {
                                character: 8,
                                line: 20,
                            },
                        },
                    },
                ],
            },
        });
    });
});
