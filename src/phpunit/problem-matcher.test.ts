import { describe, expect, it } from '@jest/globals';
import { parser, problemMatcher, TestExtraResultEvent, TestResultEvent } from './problem-matcher';

describe('Problem Matcher Test', () => {
    describe('Teamcity Parser', () => {
        it('parse phpunit version', () => {
            const text = 'PHPUnit 9.5.25 #StandWithUkraine';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testVersion,
                phpunit: '9.5.25',
                paratest: undefined,
                text,
            });
        });

        it('parse paratest and phpunit version', () => {
            const text =
                'ParaTest v6.6.5 upon PHPUnit 9.5.26 by Sebastian Bergmann and contributors.';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testVersion,
                phpunit: '9.5.26',
                paratest: '6.6.5',
                text,
            });
        });

        it('parse runtime', () => {
            const text = `Runtime:       PHP 8.1.12`;

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testRuntime,
                runtime: 'PHP 8.1.12',
                text,
            });
        });

        it('parse configuration', () => {
            const text = `Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/project-stub/phpunit.xml`;

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testConfiguration,
                configuration:
                    '/Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/project-stub/phpunit.xml',
                text,
            });
        });

        it('parse testCount', () => {
            const text = "##teamcity[testCount count='19' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestExtraResultEvent.testCount,
                kind: TestExtraResultEvent.testCount,
                count: 19,
                flowId: 8024,
            });
        });

        it('parse default testSuiteStarted', () => {
            const text = "##teamcity[testSuiteStarted name='default' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testSuiteStarted,
                kind: TestResultEvent.testSuiteStarted,
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse default testSuiteFinished', () => {
            const text = "##teamcity[testSuiteFinished name='default' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testSuiteFinished,
                kind: TestResultEvent.testSuiteFinished,
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse testSuiteStarted with locationHint', () => {
            const text =
                "##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\CalculatorTest' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testSuiteStarted,
                kind: TestResultEvent.testSuiteStarted,
                id: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                testId: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php',
                name: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest',
                flowId: 8024,
            });
        });

        it('parse test_passed testStarted', () => {
            const text =
                "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testStarted,
                kind: TestResultEvent.testStarted,
                name: 'test_passed',
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                flowId: 8024,
            });
        });

        it('parse test_passed testFinished', () => {
            const text = "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testFinished,
                kind: TestResultEvent.testFinished,
                name: 'test_passed',
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_failed testFailed', () => {
            const text =
                "##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ' duration='0' flowId='8024'] ";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
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
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
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
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'test_sum_item_method_not_call',
                message:
                    'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called\r\n exactly 1 times but called 0 times.',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                        line: 38,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                        line: 308,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                        line: 119,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 299,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 284,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php',
                        line: 204,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 68,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 43,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php',
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
                event: TestResultEvent.testIgnored,
                kind: TestResultEvent.testIgnored,
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
                event: TestResultEvent.testIgnored,
                kind: TestResultEvent.testIgnored,
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
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'test_risky',
                message: 'This test did not perform any assertions',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        line: 30,
                    },
                ],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_failed with pdo exception', () => {
            const text = ` ##teamcity[testFailed name='testExample' message='Illuminate\\Database\\QueryException : SQLSTATE|[HY000|]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)' details='  C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n |n Caused by|n PDOException: SQLSTATE|[HY000|]: General error: 1 no such table: roles|n |n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ' duration='189' flowId='68348'] `;

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'testExample',
                message:
                    'Illuminate\\Database\\QueryException : SQLSTATE[HY000]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                        line: 38,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                        line: 308,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                        line: 119,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 299,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                        line: 284,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php',
                        line: 204,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 68,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                        line: 43,
                    },
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php',
                        line: 29,
                    },
                ],
                duration: 189,
                flowId: 68348,
            });
        });

        it('parse failed message with file path', () => {
            const text = `##teamcity[testFailed name='test_static_public_fail' message='This test did not perform any assertions|n|nC:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\StaticMethodTest.php:9' details=' ' duration='0' flowId='8024']`;

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'test_static_public_fail',
                message: 'This test did not perform any assertions',
                details: [
                    {
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\StaticMethodTest.php',
                        line: 9,
                    },
                ],
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse time and memory', () => {
            const text = 'Time: 00:00.049, Memory: 6.00 MB';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.timeAndMemory,
                time: '00:00.049',
                memory: '6.00 MB',
                text,
            });
        });

        it('parse time and memory ms', () => {
            const text = 'Time: 49 ms, Memory: 6.00 MB';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.timeAndMemory,
                time: '49 ms',
                memory: '6.00 MB',
                text,
            });
        });

        it('parse test successful result count', () => {
            const text = 'OK (1 test, 1 assertion)';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testResultSummary,
                tests: 1,
                assertions: 1,
                text,
            });
        });

        it('parse test result', () => {
            const text =
                'Tests: 19, Assertions: 15, Errors: 2, Failures: 4, Skipped: 1, Incomplete: 1, Risky: 2.';

            expect(parser.parse(text)).toEqual({
                kind: TestExtraResultEvent.testResultSummary,
                tests: 19,
                assertions: 15,
                errors: 2,
                failures: 4,
                skipped: 1,
                incomplete: 1,
                risky: 2,
                text,
            });
        });

        it('parse addition_provider with data set with number key', () => {
            const text =
                "##teamcity[testStarted name='addition_provider with data set #2' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2' flowId='8024']";

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testStarted,
                kind: TestResultEvent.testStarted,
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                name: 'addition_provider with data set #2',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                flowId: 8024,
            });
        });

        it('parse addition_provider with data set with string key', () => {
            const text =
                '##teamcity[testStarted name=\'addition_provider with data set ""foo-bar_%$"\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"\' flowId=\'8024\']';

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testStarted,
                kind: TestResultEvent.testStarted,
                id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"',
                testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                name: 'addition_provider with data set ""foo-bar_%$"',
                locationHint:
                    'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"',
                flowId: 8024,
            });
        });
    });

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
                    'Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/project-stub/phpunit.xml',
                    {
                        kind: TestExtraResultEvent.testConfiguration,
                        configuration:
                            '/Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/project-stub/phpunit.xml',
                        text: 'Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/project-stub/phpunit.xml',
                    },
                ],
                [
                    'full test suite started',
                    "##teamcity[testSuiteStarted name='default' flowId='8024']",
                    {
                        event: TestResultEvent.testSuiteStarted,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    "##teamcity[testCount count='19' flowId='8024']",
                    {
                        event: TestExtraResultEvent.testCount,
                        count: 19,
                        flowId: 8024,
                    },
                ],
                [
                    'test suite started',
                    "##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\AssertionsTest' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='8024']",
                    {
                        event: TestResultEvent.testSuiteStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass started',
                    "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']",
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test pass finished',
                    "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']",
                    {
                        event: TestResultEvent.testFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                        flowId: 8024,
                    },
                ],
                [
                    'test failed started',
                    "##teamcity[testStarted name='test_is_not_same' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same' flowId='8024']",
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
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
                        event: TestResultEvent.testFailed,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
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
                    'test addition_provider suite start',
                    "##teamcity[testSuiteStarted name='addition_provider' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider' flowId='8024']",
                    {
                        event: TestResultEvent.testSuiteStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        flowId: 8024,
                    },
                ],
                [
                    'test addition_provider with data start',
                    "##teamcity[testStarted name='addition_provider with data set #2' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2' flowId='8024']",
                    {
                        event: TestResultEvent.testStarted,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        flowId: 8024,
                    },
                ],
                [
                    'test addition_provider with data failed',
                    "##teamcity[testFailed name='addition_provider with data set #2' message='Failed asserting that 1 matches expected 2.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:60|n ' duration='0' type='comparisonFailure' actual='1' expected='2' flowId='8024']",
                    undefined,
                ],
                [
                    'test addition_provider with data finished',
                    "##teamcity[testFinished name='addition_provider with data set #2' duration='0' flowId='8024']",
                    {
                        event: TestResultEvent.testFailed,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
                        file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
                        locationHint:
                            'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
                        message: 'Failed asserting that 1 matches expected 2.',
                        details: [
                            {
                                file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php',
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
                    "##teamcity[testSuiteFinished name='Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='8024']",
                    {
                        event: TestResultEvent.testSuiteFinished,
                        id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
                        flowId: 8024,
                    },
                ],
                [
                    'full test suite finished',
                    "##teamcity[testSuiteFinished name='default' flowId='8024']",
                    {
                        event: TestResultEvent.testSuiteFinished,
                        name: 'default',
                        flowId: 8024,
                    },
                ],
                [
                    'test count',
                    "##teamcity[testCount count='19' flowId='8024']",
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
                        expect.objectContaining(expected)
                    );
                }
            };

            it.each(contents)('%s', (...x: any[]) => {
                const [, context, expected] = x;

                resultShouldBe(context, expected);
            });
        });
    });
});
