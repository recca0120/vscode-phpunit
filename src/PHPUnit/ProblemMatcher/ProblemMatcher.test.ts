import 'jest';
import { it } from '@jest/globals';
import { TestExtraResultEvent, TestResultEvent } from './parser';
import { ProblemMatcher } from './ProblemMatcher';

const problemMatcher = new ProblemMatcher();
describe('Problem Matcher Test', () => {
    describe('ProblemMatcher Text', () => {
        describe('Teamcity Life Cycle', () => {
            const contents = [
                [
                    'phpunit version',
                    'PHPUnit 9.5.25 #StandWithUkraine',
                    {
                        kind: TestExtraResultEvent.testVersion,
                        phpunit: '9.5.25',
                        text: `PHPUnit 9.5.25 #StandWithUkraine`,
                    },
                ],
                [
                    'parse runtime',
                    'Runtime:       PHP 8.1.12',
                    {
                        kind: TestExtraResultEvent.testRuntime,
                        runtime: 'PHP 8.1.12',
                        text: 'Runtime:       PHP 8.1.12',
                    },
                ],
                [
                    'parse configuration',
                    'Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/phpunit.xml',
                    {
                        kind: TestExtraResultEvent.testConfiguration,
                        configuration:
                            '/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/phpunit.xml',
                        text: 'Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/phpunit.xml',
                    },
                ],
                [
                    'full test suite started',
                    '##teamcity[testSuiteStarted name=\'default\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testSuiteStarted,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    '##teamcity[testCount count=\'19\' flowId=\'8024\']',
                    {
                        event: TestExtraResultEvent.testCount,
                        count: 19,
                        flowId: 8024,
                    },
                ],
                [
                    'test suite started',
                    '##teamcity[testSuiteStarted name=\'Recca0120\\VSCode\\Tests\\AssertionsTest\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testSuiteStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass started',
                    '##teamcity[testStarted name=\'test_passed\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass finished',
                    '##teamcity[testFinished name=\'test_passed\' duration=\'0\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test failed started',
                    '##teamcity[testStarted name=\'test_is_not_same\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        flowId: 8024,
                    },
                ],
                [
                    'test failed result',
                    '##teamcity[testFailed name=\'test_is_not_same\' message=\'Failed asserting that two arrays are identical.\' details=\' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:27|n \' duration=\'0\' type=\'comparisonFailure\' actual=\'Array &0 (|n    |\'e|\' => |\'f|\'|n    0 => |\'g|\'|n    1 => |\'h|\'|n)\' expected=\'Array &0 (|n    |\'a|\' => |\'b|\'|n    |\'c|\' => |\'d|\'|n)\' flowId=\'8024\']',
                    undefined,
                ],
                [
                    'test failed finished',
                    '##teamcity[testFinished name=\'test_is_not_same\' duration=\'0\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testFailed,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        message: 'Failed asserting that two arrays are identical.',
                        details: [
                            {
                                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                                line: 27,
                            },
                        ],
                        duration: 0,
                        type: 'comparisonFailure',
                        actual: 'Array &0 (\n    \'e\' => \'f\'\n    0 => \'g\'\n    1 => \'h\'\n)',
                        expected: 'Array &0 (\n    \'a\' => \'b\'\n    \'c\' => \'d\'\n)',
                        flowId: 8024,
                    },
                ],
                [
                    'test addition_provider suite start',
                    '##teamcity[testSuiteStarted name=\'addition_provider\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testSuiteStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        flowId: 8024,
                    },
                ],
                [
                    'test addition_provider with data start',
                    '##teamcity[testStarted name=\'addition_provider with data set #2\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        flowId: 8024,
                    },
                ],
                [
                    'test addition_provider with data failed',
                    '##teamcity[testFailed name=\'addition_provider with data set #2\' message=\'Failed asserting that 1 matches expected 2.\' details=\' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:60|n \' duration=\'0\' type=\'comparisonFailure\' actual=\'1\' expected=\'2\' flowId=\'8024\']',
                    undefined,
                ],
                [
                    'test addition_provider with data finished',
                    '##teamcity[testFinished name=\'addition_provider with data set #2\' duration=\'0\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testFailed,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        message: 'Failed asserting that 1 matches expected 2.',
                        details: [
                            {
                                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                                line: 60,
                            },
                        ],
                        type: 'comparisonFailure',
                        actual: 1,
                        expected: 2,
                        duration: 0,
                        flowId: 8024,
                    },
                ],
                [
                    'test suite finished',
                    '##teamcity[testSuiteFinished name=\'Recca0120\\VSCode\\Tests\\AssertionsTest\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testSuiteFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'full test suite finished',
                    '##teamcity[testSuiteFinished name=\'default\' flowId=\'8024\']',
                    {
                        event: TestResultEvent.testSuiteFinished,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    '##teamcity[testCount count=\'19\' flowId=\'8024\']',
                    {
                        event: TestExtraResultEvent.testCount,
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
                    expect(problemMatcher.parse(content)).toBeUndefined();
                } else {
                    expect(problemMatcher.parse(content)).toEqual(
                        expect.objectContaining(expected),
                    );
                }
            };

            it.each(contents)('%s', (...x: any[]) => {
                const [, context, expected] = x;

                resultShouldBe(context, expected);
            });
        });
    });

    it('parse test_throw_exception testFailed', () => {
        const contents = [
            '##teamcity[testStarted name=\'test_throw_exception\' locationHint=\'php_qn:///Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/tests/CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception\' flowId=\'28756\']',
            '##teamcity[testFailed name=\'test_throw_exception\' message=\'Exception\' details=\'/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/src/Calculator.php:21|n/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/tests/CalculatorTest.php:54|n\' duration=\'0\' flowId=\'28756\']',
            '##teamcity[testFailed name=\'test_throw_exception\' message=\'This test did not perform any assertions\' details=\'\' duration=\'15\' flowId=\'28756\']',
            '##teamcity[testFinished name=\'test_throw_exception\' duration=\'15\' flowId=\'28756\']',
        ];

        let result;
        for (const content of contents) {
            result = problemMatcher.parse(content);
        }

        expect(result).toEqual(
            expect.objectContaining({
                event: TestResultEvent.testFailed,
                name: 'test_throw_exception',
                locationHint:
                    'php_qn:///Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/tests/CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception',
                flowId: 28756,
                kind: 'testFailed',
                id: 'Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception',
                file: '/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/tests/CalculatorTest.php',
                testId: 'Recca0120\\VSCode\\Tests\\CalculatorTest::test_throw_exception',
                message: 'Exception\n\nThis test did not perform any assertions',
                details: [
                    {
                        file: '/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/src/Calculator.php',
                        line: 21,
                    },
                    {
                        file: '/Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/phpunit-stub/tests/CalculatorTest.php',
                        line: 54,
                    },
                ],
                duration: 15,
            }),
        );
    });
});
