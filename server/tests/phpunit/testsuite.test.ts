import { Test, Type, Testsuite, Assertion } from '../../src/phpunit';
import { TextDocument, DiagnosticSeverity, Range, Diagnostic, PublishDiagnosticsParams } from 'vscode-languageserver';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { projectPath, pathPattern } from '../helpers';
import { FilesystemContract, Filesystem } from '../../src/filesystem';

describe('Testsuite Test', () => {
    const files: FilesystemContract = new Filesystem();
    const testsuite: Testsuite = new Testsuite();
    beforeEach(async () => {
        const content: string = await files.get(projectPath('junit.xml'));
        await testsuite.parseJUnit(
            content.replace(pathPattern, (...m) => {
                return projectPath(m[1]);
            })
        );
    });

    it('it should get diagnostics', () => {
        const diagnostics: Map<string, PublishDiagnosticsParams> = testsuite.getDiagnostics();
        let publishDiagnosticsParams: PublishDiagnosticsParams = diagnostics.get(
            files.uri(projectPath('tests/AssertionsTest.php'))
        );
        expect(publishDiagnosticsParams.uri).toEqual(files.uri(projectPath('tests/AssertionsTest.php')));
        expect(publishDiagnosticsParams.diagnostics[0]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message: 'Failed asserting that false is true.',
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
            relatedInformation: [],
        });

        expect(publishDiagnosticsParams.diagnostics[1]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message:
                "Failed asserting that two arrays are identical.\n--- Expected\n+++ Actual\n@@ @@\n Array &0 (\n-    'a' => 'b'\n-    'c' => 'd'\n+    'e' => 'f'\n+    0 => 'g'\n+    1 => 'h'\n )",
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
            relatedInformation: [],
        });

        publishDiagnosticsParams = diagnostics.get(files.uri(projectPath('tests/CalculatorTest.php')));
        expect(publishDiagnosticsParams.uri).toEqual(files.uri(projectPath('tests/CalculatorTest.php')));
        expect(publishDiagnosticsParams.diagnostics[0]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message:
                'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
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
            relatedInformation: [
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    location: {
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
                },
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    location: {
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
                },
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    location: {
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
                },
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    location: {
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
                },
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
                    location: {
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
                },
                {
                    message:
                        'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',

                    location: {
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
                        uri: files.uri(projectPath('vendor/mockery/mockery/library/Mockery.php')),
                    },
                },
            ],
        });

        expect(publishDiagnosticsParams.diagnostics[1]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message: 'Failed asserting that 4 is identical to 3.',
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
            relatedInformation: [],
        });

        expect(publishDiagnosticsParams.diagnostics[2]).toEqual({
            severity: 1,
            source: 'PHPUnit',
            message: 'Exception:',
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
            relatedInformation: [
                {
                    message: 'Exception:',
                    location: {
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
                },
            ],
        });
    });

    it('it should get assertions', () => {
        let assertions: Assertion[] = testsuite.getAssertions(files.uri(projectPath('tests/AssertionsTest.php')));

        expect(assertions[0]).toEqual({
            name: 'test_passed',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'passed',
            fault: {
                type: '',
                message: '',
            },
        });

        expect(assertions[1]).toEqual({
            name: 'test_error',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'failure',
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message: 'Failed asserting that false is true.',
            },
        });

        expect(assertions[2]).toEqual({
            name: 'test_assertion_isnt_same',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'failure',
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message:
                    "Failed asserting that two arrays are identical.\n--- Expected\n+++ Actual\n@@ @@\n Array &0 (\n-    'a' => 'b'\n-    'c' => 'd'\n+    'e' => 'f'\n+    0 => 'g'\n+    1 => 'h'\n )",
            },
        });

        expect(assertions[3]).toEqual({
            name: 'test_risky',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'risky',
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: 'Risky Test',
            },
        });

        expect(assertions[4]).toEqual({
            name: 'it_should_be_annotation_test',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'passed',
            fault: {
                type: '',
                message: '',
            },
        });

        expect(assertions[5]).toEqual({
            name: 'test_skipped',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'skipped',
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: 'Skipped Test',
            },
        });

        expect(assertions[6]).toEqual({
            name: 'test_incomplete',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'skipped',
            fault: {
                type: 'PHPUnit\\Framework\\SkippedTestError',
                message: 'Skipped Test',
            },
        });

        expect(assertions[7]).toEqual({
            name: 'test_no_assertion',
            class: 'Tests\\AssertionsTest',
            classname: 'Tests.AssertionsTest',
            uri: files.uri(projectPath('tests/AssertionsTest.php')),
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
            type: 'risky',
            fault: {
                type: 'PHPUnit\\Framework\\RiskyTestError',
                message: 'Risky Test',
            },
        });

        assertions = testsuite.getAssertions(files.uri(projectPath('tests/CalculatorTest.php')));

        expect(assertions[0]).toEqual({
            name: 'test_sum_item_method_not_call',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
            type: 'error',
            fault: {
                type: 'Mockery\\Exception\\InvalidCountException',
                message:
                    'Mockery\\Exception\\InvalidCountException: Method test(<Any Arguments>) from Mockery_0_App_Item_App_Item should be called\n exactly 1 times but called 0 times.',
            },
        });

        expect(assertions[1]).toEqual({
            name: 'test_sum',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
            type: 'passed',
            fault: {
                type: '',
                message: '',
            },
        });

        expect(assertions[2]).toEqual({
            name: 'test_sum_fail',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
            type: 'failure',
            fault: {
                type: 'PHPUnit\\Framework\\ExpectationFailedException',
                message: 'Failed asserting that 4 is identical to 3.',
            },
        });

        expect(assertions[3]).toEqual({
            name: 'test_sum_item',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
            type: 'passed',
            fault: {
                type: '',
                message: '',
            },
        });

        expect(assertions[4]).toEqual({
            name: 'test_throw_exception',
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
            type: 'error',
            fault: {
                type: 'Exception',
                message: 'Exception:',
            },
        });

        assertions = testsuite.getAssertions(files.uri(projectPath('src/Calculator.php')));
        expect(assertions[0]).toEqual({
            class: 'Tests\\CalculatorTest',
            classname: 'Tests.CalculatorTest',
            name: 'test_throw_exception',
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
            time: 0.000157,
            type: 'error',
            fault: {
                type: 'Exception',
                message: 'Exception:',
                details: [
                    {
                        uri: files.uri(projectPath('tests/CalculatorTest.php')),
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
