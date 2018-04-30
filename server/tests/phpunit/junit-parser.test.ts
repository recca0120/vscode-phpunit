import { Filesystem } from '../../src/filesystem';
import { JUnitParser, Test, Type } from '../../src/phpunit';
import { parse } from 'fast-xml-parser';
import { pathPattern, projectPath, projectUri } from './../helpers';
import { resolve } from 'path';

describe('JUnit Parser Test', () => {
    const files = new Filesystem();
    const jUnit: JUnitParser = new JUnitParser(files);
    const path = projectPath('tests/AssertionsTest.php');
    const path2 = projectPath('tests/CalculatorTest.php');
    let content: string = '';
    let tests: Test[] = [];

    beforeAll(async () => {
        const jUnitFile: string = projectPath('build/testsuite.xml');
        content = await files.get(jUnitFile);
        content = content.replace(pathPattern, (...m) => {
            return projectPath(m[1]);
        });
        spyOn(files, 'get').and.returnValue(content);
        spyOn(files, 'unlink').and.callFake(() => {});
        tests = await jUnit.parseFile(jUnitFile);
    });

    describe('AssertionsTest', () => {
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
                time: jasmine.any(Number),
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
                        character: 32,
                        line: 13,
                    },
                    start: {
                        character: 4,
                        line: 13,
                    },
                },
                time: jasmine.any(Number),
                type: Type.FAILURE,
                fault: {
                    type: 'PHPUnit\\Framework\\ExpectationFailedException',
                    message: 'Failed asserting that false is true.',
                    details: [
                        {
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
                            uri: projectUri('tests/AssertionsTest.php'),
                        },
                    ],
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
                        character: 46,
                        line: 18,
                    },
                    start: {
                        character: 4,
                        line: 18,
                    },
                },
                time: jasmine.any(Number),
                type: Type.FAILURE,
                fault: {
                    type: 'PHPUnit\\Framework\\ExpectationFailedException',
                    message:
                        "Failed asserting that two arrays are identical.\n--- Expected\n+++ Actual\n@@ @@\n Array &0 (\n-    'a' => 'b'\n-    'c' => 'd'\n+    'e' => 'f'\n+    0 => 'g'\n+    1 => 'h'\n )",
                    details: [
                        {
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
                            uri: projectUri('tests/AssertionsTest.php'),
                        },
                    ],
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
                time: jasmine.any(Number),
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
                time: jasmine.any(Number),
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
                time: jasmine.any(Number),
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
                time: jasmine.any(Number),
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
                time: jasmine.any(Number),
                type: Type.RISKY,
                fault: {
                    type: 'PHPUnit\\Framework\\RiskyTestError',
                    message: 'Risky Test',
                    details: [],
                },
            });
        });

        it('test_addition_provider', () => {
            for (let i = 0; i < 2; i++) {
                expect(tests[8 + i]).toEqual({
                    name: `test_addition_provider with data set #${i}`,
                    class: 'Tests\\AssertionsTest',
                    classname: 'Tests.AssertionsTest',
                    uri: files.uri(path),
                    range: {
                        end: {
                            character: 61,
                            line: 53,
                        },
                        start: {
                            character: 4,
                            line: 53,
                        },
                    },
                    time: jasmine.any(Number),
                    type: Type.PASSED,
                });
            }
        });
    });

    describe('CalculatorTest', () => {
        it('test_sum', () => {
            expect(tests[11]).toEqual({
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
                time: jasmine.any(Number),
                type: Type.PASSED,
            });
        });

        it('test_sum_fail', () => {
            expect(tests[12]).toEqual({
                name: 'test_sum_fail',
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                uri: files.uri(path2),
                range: {
                    end: {
                        character: 35,
                        line: 24,
                    },
                    start: {
                        character: 4,
                        line: 24,
                    },
                },
                time: jasmine.any(Number),
                type: Type.FAILURE,
                fault: {
                    type: 'PHPUnit\\Framework\\ExpectationFailedException',
                    message: 'Failed asserting that 4 is identical to 3.',
                    details: [
                        {
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
                            uri: projectUri('tests/CalculatorTest.php'),
                        },
                    ],
                },
            });
        });

        it('test_sum_item', () => {
            expect(tests[13]).toEqual({
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
                time: jasmine.any(Number),
                type: Type.PASSED,
            });
        });

        it('test_sum_item_method_not_call', () => {
            expect(tests[14]).toEqual({
                name: 'test_sum_item_method_not_call',
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                uri: projectUri(path2),
                range: {
                    end: {
                        character: 51,
                        line: 41,
                    },
                    start: {
                        character: 4,
                        line: 41,
                    },
                },
                time: jasmine.any(Number),
                type: Type.ERROR,
                fault: {
                    type: 'Mockery\\Exception\\InvalidCountException',
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    details: [
                        {
                            uri: projectUri('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php'),
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
                            uri: projectUri('vendor/mockery/mockery/library/Mockery/Expectation.php'),
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
                            uri: projectUri('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php'),
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
                            uri: projectUri('vendor/mockery/mockery/library/Mockery/Container.php'),
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
                            uri: projectUri('vendor/mockery/mockery/library/Mockery/Container.php'),
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
                            uri: projectUri('vendor/mockery/mockery/library/Mockery.php'),
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
                        {
                            uri: projectUri('tests/CalculatorTest.php'),
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
                        },
                    ],
                },
            });
        });

        it('test_sum_item', () => {
            expect(tests[15]).toEqual({
                name: 'test_throw_exception',
                class: 'Tests\\CalculatorTest',
                classname: 'Tests.CalculatorTest',
                uri: projectUri(path2),
                range: {
                    end: {
                        character: 42,
                        line: 53,
                    },
                    start: {
                        character: 4,
                        line: 53,
                    },
                },
                time: jasmine.any(Number),
                type: Type.ERROR,
                fault: {
                    type: 'Exception',
                    message: 'Exception:',
                    details: [
                        {
                            uri: projectUri('src/Calculator.php'),
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
                        {
                            uri: projectUri('tests/CalculatorTest.php'),
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
                        },
                    ],
                },
            });
        });
    });
});
