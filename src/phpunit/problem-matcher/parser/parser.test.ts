import { describe, expect, it } from '@jest/globals';
import { TestExtraResultEvent, TestResultEvent } from './types';
import { parser } from './';

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
        const text = 'ParaTest v6.6.5 upon PHPUnit 9.5.26 by Sebastian Bergmann and contributors.';

        expect(parser.parse(text)).toEqual({
            kind: TestExtraResultEvent.testVersion,
            phpunit: '9.5.26',
            paratest: '6.6.5',
            text,
        });
    });

    it('parse processes', () => {
        const text = `Processes:     8`;

        expect(parser.parse(text)).toEqual({
            kind: TestExtraResultEvent.testProcesses,
            processes: '8',
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
        const text = `Configuration: /Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/phpunit-stub/phpunit.xml`;

        expect(parser.parse(text)).toEqual({
            kind: TestExtraResultEvent.testConfiguration,
            configuration:
                '/Users/recca0120/Desktop/vscode-phpunit/src/phpunit/__tests__/fixtures/phpunit-stub/phpunit.xml',
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
            "##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\CalculatorTest' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testSuiteStarted,
            kind: TestResultEvent.testSuiteStarted,
            id: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
            testId: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
            file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\CalculatorTest.php',
            name: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
            locationHint:
                'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\CalculatorTest.php::\\Recca0120\\VSCode\\Tests\\CalculatorTest',
            flowId: 8024,
        });
    });

    it('parse test_passed testStarted', () => {
        const text =
            "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testStarted,
            kind: TestResultEvent.testStarted,
            name: 'test_passed',
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
            locationHint:
                'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
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
            "##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:22|n ' duration='0' flowId='8024'] ";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'test_failed',
            message: 'Failed asserting that false is true.',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                    line: 22,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_is_not_same testFailed', () => {
        const text =
            "##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:27|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'test_is_not_same',
            message: 'Failed asserting that two arrays are identical.',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
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
            "##teamcity[testFailed name='test_sum_item_method_not_call' message='Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called|r|n exactly 1 times but called 0 times.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ' duration='13' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'test_sum_item_method_not_call',
            message:
                'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called\r\n exactly 1 times but called 0 times.',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                    line: 38,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                    line: 308,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                    line: 119,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                    line: 299,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                    line: 284,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery.php',
                    line: 204,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                    line: 68,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                    line: 43,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php',
                    line: 29,
                },
            ],
            duration: 13,
            flowId: 8024,
        });
    });

    it('parse test_skipped testIgnored', () => {
        const text =
            "##teamcity[testIgnored name='test_skipped' message='The MySQLi extension is not available.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:45|n ' duration='0' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testIgnored,
            kind: TestResultEvent.testIgnored,
            name: 'test_skipped',
            message: 'The MySQLi extension is not available.',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                    line: 45,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_incomplete testIgnored', () => {
        const text =
            "##teamcity[testIgnored name='test_incomplete' message='This test has not been implemented yet.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:50|n ' duration='0' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testIgnored,
            kind: TestResultEvent.testIgnored,
            name: 'test_incomplete',
            message: 'This test has not been implemented yet.',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                    line: 50,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_risky testFailed', () => {
        const text =
            "##teamcity[testFailed name='test_risky' message='This test did not perform any assertions|n|nC:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php:30' details=' ' duration='0' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'test_risky',
            message: 'This test did not perform any assertions',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
                    line: 30,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_failed with pdo exception', () => {
        const text = ` ##teamcity[testFailed name='testExample' message='Illuminate\\Database\\QueryException : SQLSTATE|[HY000|]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)' details='  C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n |n Caused by|n PDOException: SQLSTATE|[HY000|]: General error: 1 no such table: roles|n |n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ' duration='189' flowId='68348'] `;

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'testExample',
            message:
                'Illuminate\\Database\\QueryException : SQLSTATE[HY000]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php',
                    line: 38,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php',
                    line: 308,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php',
                    line: 119,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                    line: 299,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php',
                    line: 284,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery.php',
                    line: 204,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                    line: 68,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php',
                    line: 43,
                },
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php',
                    line: 29,
                },
            ],
            duration: 189,
            flowId: 68348,
        });
    });

    it('parse failed message with file path', () => {
        const text = `##teamcity[testFailed name='test_static_public_fail' message='This test did not perform any assertions|n|nC:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\StaticMethodTest.php:9' details=' ' duration='0' flowId='8024']`;

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testFailed,
            kind: TestResultEvent.testFailed,
            name: 'test_static_public_fail',
            message: 'This test did not perform any assertions',
            details: [
                {
                    file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\StaticMethodTest.php',
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
            "##teamcity[testStarted name='addition_provider with data set #2' locationHint='php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2' flowId='8024']";

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testStarted,
            kind: TestResultEvent.testStarted,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
            testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
            file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
            name: 'addition_provider with data set #2',
            locationHint:
                'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2',
            flowId: 8024,
        });
    });

    it('parse addition_provider with data set with string key', () => {
        const text =
            '##teamcity[testStarted name=\'addition_provider with data set ""foo-bar_%$"\' locationHint=\'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"\' flowId=\'8024\']';

        expect(parser.parse(text)).toEqual({
            event: TestResultEvent.testStarted,
            kind: TestResultEvent.testStarted,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"',
            testId: 'Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider',
            file: 'C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php',
            name: 'addition_provider with data set ""foo-bar_%$"',
            locationHint:
                'php_qn://C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\phpunit-stub\\tests\\AssertionsTest.php::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"',
            flowId: 8024,
        });
    });

    describe('should fix issue 138', () => {
        it('case 1', () => {
            const text = `##teamcity[testFailed name='testAddPost' message='Failed asserting that |'Der Eintrag wurde gespeichert.|' is in |'flash|' message.' details=' /U1/BACKEND/vendor/cakephp/cakephp/src/TestSuite/IntegrationTestTrait.php:1177|n /U1/BACKEND/tests/TestCase/Controller/CmsPagesControllerTest.php:169|n ' duration='247' flowId='3654']`;

            expect(parser.parse(text)).toEqual({
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'testAddPost',
                details: [
                    {
                        file: '/U1/BACKEND/vendor/cakephp/cakephp/src/TestSuite/IntegrationTestTrait.php',
                        line: 1177,
                    },
                    {
                        file: '/U1/BACKEND/tests/TestCase/Controller/CmsPagesControllerTest.php',
                        line: 169,
                    },
                ],
                message:
                    "Failed asserting that 'Der Eintrag wurde gespeichert.' is in 'flash' message.",
                duration: 247,
                flowId: 3654,
            });
        });

        it('case 2', () => {
            const text = `##teamcity[testFailed name='testCreateEntityWithExceptPathEmptyString' message='ROOT/tests/TestCase/Model/Table/Validation/CmsPagesTableValidationTest.php (line 264)|n########## DEBUG ##########|nobject(App\Model\Entity\CmsPage) id:0 {|n  |'page_name|' => |'cms_page_639ca3c184af3|'|n  |'valid_for_pages|' => (int) 1|n  |'except_path|' => null|n  |'regex_path|' => null|n  |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |'|[new|]|' => true|n  |'|[accessible|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true|n  |]|n  |'|[dirty|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true,|n    |'except_path|' => true,|n    |'regex_path|' => true,|n    |'page_settings_hash|' => true|n  |]|n  |'|[original|]|' => |[|]|n  |'|[virtual|]|' => |[|]|n  |'|[hasErrors|] |' => true|n  |'|[errors|]|' => |[|n    |'page_settings_hash|' => |[|n      |'_isUnique|' => |'This value is already in use|'|n    |]|n  |]|n  |'|[invalid|]|' => |[|n    |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |]|n  |'|[repository|]|' => |'CmsPa ges|'|n}|n###########################' details=' |n Caused by|n ErrorException: unserialize(): Error at offset 0 of 919 bytes|n |n ' duration='0' flowId='3580']`;

            expect(parser.parse(text) as any).toEqual({
                event: TestResultEvent.testFailed,
                kind: TestResultEvent.testFailed,
                name: 'testCreateEntityWithExceptPathEmptyString',
                details: [],
                message:
                    "ROOT/tests/TestCase/Model/Table/Validation/CmsPagesTableValidationTest.php (line 264)\n########## DEBUG ##########\nobject(AppModelEntityCmsPage) id:0 {\n  'page_name' => 'cms_page_639ca3c184af3'\n  'valid_for_pages' => (int) 1\n  'except_path' => null\n  'regex_path' => null\n  'page_settings_hash' => '44a9453b57d228884223347359a4b1cc'\n  '[new]' => true\n  '[accessible]' => [\n    'page_name' => true,\n    'valid_for_pages' => true\n  ]\n  '[dirty]' => [\n    'page_name' => true,\n    'valid_for_pages' => true,\n    'except_path' => true,\n    'regex_path' => true,\n    'page_settings_hash' => true\n  ]\n  '[original]' => []\n  '[virtual]' => []\n  '[hasErrors] ' => true\n  '[errors]' => [\n    'page_settings_hash' => [\n      '_isUnique' => 'This value is already in use'\n    ]\n  ]\n  '[invalid]' => [\n    'page_settings_hash' => '44a9453b57d228884223347359a4b1cc'\n  ]\n  '[repository]' => 'CmsPa ges'\n}\n###########################",
                duration: 0,
                flowId: 3580,
            });
        });
    });
});
