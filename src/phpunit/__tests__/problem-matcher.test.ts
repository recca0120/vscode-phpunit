import { describe, it, expect } from '@jest/globals';
import { parser, problemMatcher, TestEvent } from '../problem-matcher';

describe('Problem Matcher Test', () => {
    describe('Teamcity Parser', () => {
        it('parse testCount', () => {
            const text = "##teamcity[testCount count='19' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testCount,
                count: 19,
                flowId: 8024,
            });
        });

        it('parse default testSuiteStarted', () => {
            const text = "##teamcity[testSuiteStarted name='default' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testSuiteStarted,
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse default testSuiteFinished', () => {
            const text = "##teamcity[testSuiteFinished name='default' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testSuiteFinished,
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse testSuiteStarted with locationHint', () => {
            const text =
                "##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\CalculatorTest' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testSuiteStarted,
                id: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php',
                name: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest',
                flowId: 8024,
            });
        });

        it('parse test_passed testStarted', () => {
            const text =
                "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testStarted,
                name: 'test_passed',
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                flowId: 8024,
            });
        });

        it('parse test_passed testFinished', () => {
            const text = "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testFinished,
                name: 'test_passed',
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_failed testFailed', () => {
            const text =
                "##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ' duration='0' flowId='8024'] ";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testFailed,
                name: 'test_failed',
                message: 'Failed asserting that false is true.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        line: 22,
                    },
                ],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_is_not_same testFailed', () => {
            const text =
                "##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:27|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testFailed,
                name: 'test_is_not_same',
                message: 'Failed asserting that two arrays are identical.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        line: 27,
                    },
                ],
                duration: 0,
                type: 'comparisonFailure',
                actual: "Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n)",
                expected: "Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n)",
                flowId: 8024,
            });
        });

        it('parse test_sum_item_method_not_call testFailed', () => {
            const text =
                "##teamcity[testFailed name='test_sum_item_method_not_call' message='Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called|r|n exactly 1 times but called 0 times.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ' duration='13' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testFailed,
                name: 'test_sum_item_method_not_call',
                message:
                    'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called\r\n exactly 1 times but called 0 times.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                        line: 38,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                        line: 308,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                        line: 119,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 299,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 284,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php',
                        line: 204,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 68,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 43,
                    },
                    {
                        file: ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php',
                        line: 29,
                    },
                ],
                duration: 13,
                flowId: 8024,
            });
        });

        it('parse test_skipped testIgnored', () => {
            const text =
                "##teamcity[testIgnored name='test_skipped' message='The MySQLi extension is not available.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:45|n ' duration='0' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testIgnored,
                name: 'test_skipped',
                message: 'The MySQLi extension is not available.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        line: 45,
                    },
                ],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_incomplete testIgnored', () => {
            const text =
                "##teamcity[testIgnored name='test_incomplete' message='This test has not been implemented yet.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:50|n ' duration='0' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testIgnored,
                name: 'test_incomplete',
                message: 'This test has not been implemented yet.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        line: 50,
                    },
                ],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_risky testFailed', () => {
            const text =
                "##teamcity[testFailed name='test_risky' message='This test did not perform any assertions|n|nC:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:30' details=' ' duration='0' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestEvent.testFailed,
                name: 'test_risky',
                message:
                    'This test did not perform any assertions\n\nC:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:30',
                details: [],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse time and memory', () => {
            const text = 'Time: 00:00.049, Memory: 6.00 MB';

            expect(parser.parse(text)).toEqual({
                time: '00:00.049',
                memory: '6.00 MB',
            });
        });

        it('parse test result', () => {
            const text =
                'Tests: 19, Assertions: 15, Errors: 2, Failures: 4, Skipped: 1, Incomplete: 1, Risky: 2.';

            expect(parser.parse(text)).toEqual({
                tests: 19,
                assertions: 15,
                errors: 2,
                failures: 4,
                skipped: 1,
                incomplete: 1,
                risky: 2,
            });
        });
    });

    describe('ProblemMatcher Text', () => {
        describe('Teamcity Life Cycle', () => {
            const contents = [
                [
                    'full test suite started',
                    "##teamcity[testSuiteStarted name='default' flowId='8024']",
                    {
                        event: TestEvent.testSuiteStarted,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    "##teamcity[testCount count='19' flowId='8024']",
                    {
                        event: TestEvent.testCount,
                        count: 19,
                        flowId: 8024,
                    },
                ],
                [
                    'test suite started',
                    "##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\AssertionsTest' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='8024']",
                    {
                        event: TestEvent.testSuiteStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass started',
                    "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']",
                    {
                        event: TestEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass finished',
                    "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']",
                    {
                        event: TestEvent.testFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test failed started',
                    "##teamcity[testStarted name='test_is_not_same' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same' flowId='8024']",
                    {
                        event: TestEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        flowId: 8024,
                    },
                ],
                [
                    'test failed result',
                    "##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:27|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']",
                    undefined,
                ],
                [
                    'test failed finished',
                    "##teamcity[testFinished name='test_is_not_same' duration='0' flowId='8024']",
                    {
                        event: TestEvent.testFailed,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        message: 'Failed asserting that two arrays are identical.',
                        details: [
                            {
                                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                                line: 27,
                            },
                        ],
                        duration: 0,
                        type: 'comparisonFailure',
                        actual: "Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n)",
                        expected: "Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n)",
                        flowId: 8024,
                    },
                ],
                [
                    'test suite finished',
                    "##teamcity[testSuiteFinished name='Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='8024']",
                    {
                        event: TestEvent.testSuiteFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'full test suite finished',
                    "##teamcity[testSuiteFinished name='default' flowId='8024']",
                    {
                        event: TestEvent.testSuiteFinished,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    "##teamcity[testCount count='19' flowId='8024']",
                    {
                        event: TestEvent.testCount,
                        count: 19,
                        flowId: 8024,
                    },
                ],
                [
                    'test result',
                    'Tests: 19, Assertions: 15, Errors: 2, Failures: 4, Skipped: 1, Incomplete: 1, Risky: 2.',
                    {
                        tests: 19,
                        assertions: 15,
                        errors: 2,
                        failures: 4,
                        skipped: 1,
                        incomplete: 1,
                        risky: 2,
                    },
                ],
                ['empty line', '', undefined],
            ];

            const resultShouldBe = (content: string, expected: any) => {
                if (expected === undefined) {
                    expect(problemMatcher.read(content)).toBeUndefined();
                } else {
                    expect(problemMatcher.read(content)).toEqual(expect.objectContaining(expected));
                }
            };

            it.each(contents)('%s', (...x: any[]) => {
                const [, context, expected] = x;

                resultShouldBe(context, expected);
            });
        });
    });
});
