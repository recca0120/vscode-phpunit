import { TestResultParser } from '.';
import { phpUnitProject, phpUnitProjectWin } from '../__tests__/utils';
import { TeamcityEvent } from './types';

describe('TestResultParser', () => {
    const parse = (text: string) => {
        return new TestResultParser().parse(text);
    };

    it('parse phpunit version', () => {
        const text = 'PHPUnit 9.5.25 #StandWithUkraine';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testVersion,
            phpunit: '9.5.25',
            paratest: undefined,
            text,
        });
    });

    it('parse paratest and phpunit version', () => {
        const text = 'ParaTest v6.6.5 upon PHPUnit 9.5.26 by Sebastian Bergmann and contributors.';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testVersion,
            phpunit: '9.5.26',
            paratest: '6.6.5',
            text,
        });
    });

    it('parse processes', () => {
        const text = `Processes:     8`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testProcesses,
            processes: '8',
            text,
        });
    });

    it('parse runtime', () => {
        const text = `Runtime:       PHP 8.1.12`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testRuntime,
            runtime: 'PHP 8.1.12',
            text,
        });
    });

    it('parse configuration', () => {
        const text = `Configuration: ${phpUnitProject('phpunit.xml')}`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testConfiguration,
            configuration: phpUnitProject('phpunit.xml'),
            text,
        });
    });

    it('parse testCount', () => {
        const text = `##teamcity[testCount count='19' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testCount,
            count: 19,
            flowId: 8024,
        });
    });

    it('parse default testSuiteStarted', () => {
        const text = `##teamcity[testSuiteStarted name='default' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testSuiteStarted,
            name: 'default',
            flowId: 8024,
        });
    });

    it('parse default testSuiteFinished', () => {
        const text = `##teamcity[testSuiteFinished name='default' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testSuiteFinished,
            name: 'default',
            flowId: 8024,
        });
    });

    it('parse testSuiteStarted with locationHint', () => {
        const text = `##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\CalculatorTest' locationHint='php_qn://${phpUnitProjectWin('tests/CalculatorTest.php')}::\\Recca0120\\VSCode\\Tests\\CalculatorTest' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testSuiteStarted,
            id: 'Calculator (Recca0120\\VSCode\\Tests\\Calculator)',
            file: phpUnitProjectWin('tests/CalculatorTest.php'),
            name: 'Recca0120\\VSCode\\Tests\\CalculatorTest',
            locationHint: `php_qn://${phpUnitProjectWin('tests/CalculatorTest.php')}::\\Recca0120\\VSCode\\Tests\\CalculatorTest`,
            flowId: 8024,
        });
    });

    it('parse test_passed testStarted', () => {
        const text = `##teamcity[testStarted name='test_passed' locationHint='php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testStarted,
            name: 'test_passed',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Passed',
            file: phpUnitProjectWin('tests/AssertionsTest.php'),
            locationHint: `php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed`,
            flowId: 8024,
        });
    });

    it('parse test_passed testFinished', () => {
        const text = `##teamcity[testFinished name='test_passed' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_failed testFailed', () => {
        const text = `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:22|n ' duration='0' flowId='8024'] `;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            message: 'Failed asserting that false is true.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 22,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_is_not_same testFailed', () => {
        const text = `##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:27|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_is_not_same',
            message: 'Failed asserting that two arrays are identical.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 27,
                },
            ],
            duration: 0,
            type: 'comparisonFailure',
            actual: `Array &0 (\n    'e' => 'f'\n    0 => 'g'\n    1 => 'h'\n)`,
            expected: `Array &0 (\n    'a' => 'b'\n    'c' => 'd'\n)`,
            flowId: 8024,
        });
    });

    it('parse test_sum_item_method_not_call testFailed', () => {
        const text = `##teamcity[testFailed name='test_sum_item_method_not_call' message='Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called|r|n exactly 1 times but called 0 times.' details=' ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php')}:38|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Expectation.php')}:308|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php')}:119|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php')}:299|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php')}:284|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery.php')}:204|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:68|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:43|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php')}:29|n ' duration='13' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_sum_item_method_not_call',
            message: 'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called\r\n exactly 1 times but called 0 times.',
            details: [
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php'),
                    line: 38,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Expectation.php'),
                    line: 308,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php'),
                    line: 119,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php'),
                    line: 299,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php'),
                    line: 284,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery.php'),
                    line: 204,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php'),
                    line: 68,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php'),
                    line: 43,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php'),
                    line: 29,
                },
            ],
            duration: 13,
            flowId: 8024,
        });
    });

    it('parse test_skipped testIgnored', () => {
        const text = `##teamcity[testIgnored name='test_skipped' message='The MySQLi extension is not available.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:45|n ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            message: 'The MySQLi extension is not available.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 45,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_incomplete testIgnored', () => {
        const text = `##teamcity[testIgnored name='test_incomplete' message='This test has not been implemented yet.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:50|n ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testIgnored,
            name: 'test_incomplete',
            message: 'This test has not been implemented yet.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 50,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_risky testFailed', () => {
        const text = `##teamcity[testFailed name='test_risky' message='This test did not perform any assertions|n|n${phpUnitProjectWin('tests/AssertionsTest.php')}:30' details=' ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_risky',
            message: 'This test did not perform any assertions',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 30,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_failed with pdo exception', () => {
        const text = ` ##teamcity[testFailed name='testExample' message='Illuminate\\Database\\QueryException : SQLSTATE|[HY000|]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)' details='  ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php')}:38|n |n Caused by|n PDOException: SQLSTATE|[HY000|]: General error: 1 no such table: roles|n |n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Expectation.php')}:308|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php')}:119|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php')}:299|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php')}:284|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery.php')}:204|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:68|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php')}:43|n ${phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php')}:29|n ' duration='189' flowId='68348'] `;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'testExample',
            message: 'Illuminate\\Database\\QueryException : SQLSTATE[HY000]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)',
            details: [
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php'),
                    line: 38,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Expectation.php'),
                    line: 308,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/ExpectationDirector.php'),
                    line: 119,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php'),
                    line: 299,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Container.php'),
                    line: 284,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery.php'),
                    line: 204,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php'),
                    line: 68,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php'),
                    line: 43,
                },
                {
                    file: phpUnitProjectWin('vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php'),
                    line: 29,
                },
            ],
            duration: 189,
            flowId: 68348,
        });
    });

    it('parse failed message with file path', () => {
        const text = `##teamcity[testFailed name='test_static_public_fail' message='This test did not perform any assertions|n|n${phpUnitProjectWin('tests/StaticMethodTest.php')}:9' details=' ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_static_public_fail',
            message: 'This test did not perform any assertions',
            details: [
                {
                    file: phpUnitProjectWin('tests/StaticMethodTest.php'),
                    line: 9,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse time and memory', () => {
        const text = 'Time: 00:00.049, Memory: 6.00 MB';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testDuration,
            time: '00:00.049',
            memory: '6.00 MB',
            text,
        });
    });

    it('parse time and memory ms', () => {
        const text = 'Time: 49 ms, Memory: 6.00 MB';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testDuration,
            time: '49 ms',
            memory: '6.00 MB',
            text,
        });
    });

    it('parse test successful result count', () => {
        const text = 'OK (1 test, 1 assertion)';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testResultSummary,
            tests: 1,
            assertions: 1,
            text,
        });
    });

    it('parse test result', () => {
        const text = 'Tests: 19, Assertions: 15, Errors: 2, Failures: 4, Skipped: 1, Incomplete: 1, Risky: 2.';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testResultSummary,
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

    it('parse test result with PHPUnit Deprecations', () => {
        const text = 'Tests: 1, Assertions: 1, PHPUnit Deprecations: 1, Risky: 1.';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testResultSummary,
            tests: 1,
            assertions: 1,
            phpunitDeprecations: 1,
            risky: 1,
            text,
        });
    });

    it('parse addition_provider with data set with number key', () => {
        const text = `##teamcity[testStarted name='addition_provider with data set #2' locationHint='php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testStarted,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #2',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            file: phpUnitProjectWin('tests/AssertionsTest.php'),
            name: 'addition_provider with data set #2',
            locationHint: `php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2`,
            flowId: 8024,
        });
    });

    it('parse addition_provider with data set with string key', () => {
        const text = `##teamcity[testStarted name='addition_provider with data set ""foo-bar_%$"' locationHint='php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testStarted,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            file: phpUnitProjectWin('tests/AssertionsTest.php'),
            name: 'addition_provider with data set ""foo-bar_%$"',
            locationHint: `php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set ""foo-bar_%$"`,
            flowId: 8024,
        });
    });

    it('printed output', () => {
        const text = `printed output##teamcity[testFailed name='test_echo' message='This test printed output: printed output' details='' duration='3' flowId='38813']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_echo',
            details: [],
            message: 'This test printed output: printed output',
            duration: 3,
            flowId: 38813,
        });
    });

    describe('should fix issue 138', () => {
        it('case 1', () => {
            const text = `##teamcity[testFailed name='testAddPost' message='Failed asserting that |'Der Eintrag wurde gespeichert.|' is in |'flash|' message.' details=' /U1/BACKEND/vendor/cakephp/cakephp/src/TestSuite/IntegrationTestTrait.php:1177|n /U1/BACKEND/tests/TestCase/Controller/CmsPagesControllerTest.php:169|n ' duration='247' flowId='3654']`;

            expect(parse(text)).toEqual({
                event: TeamcityEvent.testFailed,
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
                message: `Failed asserting that 'Der Eintrag wurde gespeichert.' is in 'flash' message.`,
                duration: 247,
                flowId: 3654,
            });
        });

        it('case 2', () => {
            const text = `##teamcity[testFailed name='testCreateEntityWithExceptPathEmptyString' message='ROOT/tests/TestCase/Model/Table/Validation/CmsPagesTableValidationTest.php (line 264)|n########## DEBUG ##########|nobject(App\Model\Entity\CmsPage) id:0 {|n  |'page_name|' => |'cms_page_639ca3c184af3|'|n  |'valid_for_pages|' => (int) 1|n  |'except_path|' => null|n  |'regex_path|' => null|n  |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |'|[new|]|' => true|n  |'|[accessible|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true|n  |]|n  |'|[dirty|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true,|n    |'except_path|' => true,|n    |'regex_path|' => true,|n    |'page_settings_hash|' => true|n  |]|n  |'|[original|]|' => |[|]|n  |'|[virtual|]|' => |[|]|n  |'|[hasErrors|] |' => true|n  |'|[errors|]|' => |[|n    |'page_settings_hash|' => |[|n      |'_isUnique|' => |'This value is already in use|'|n    |]|n  |]|n  |'|[invalid|]|' => |[|n    |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |]|n  |'|[repository|]|' => |'CmsPa ges|'|n}|n###########################' details=' |n Caused by|n ErrorException: unserialize(): Error at offset 0 of 919 bytes|n |n ' duration='0' flowId='3580']`;

            expect(parse(text) as any).toEqual({
                event: TeamcityEvent.testFailed,
                name: 'testCreateEntityWithExceptPathEmptyString',
                details: [],
                message: `ROOT/tests/TestCase/Model/Table/Validation/CmsPagesTableValidationTest.php (line 264)\n########## DEBUG ##########\nobject(AppModelEntityCmsPage) id:0 {\n  'page_name' => 'cms_page_639ca3c184af3'\n  'valid_for_pages' => (int) 1\n  'except_path' => null\n  'regex_path' => null\n  'page_settings_hash' => '44a9453b57d228884223347359a4b1cc'\n  '[new]' => true\n  '[accessible]' => [\n    'page_name' => true,\n    'valid_for_pages' => true\n  ]\n  '[dirty]' => [\n    'page_name' => true,\n    'valid_for_pages' => true,\n    'except_path' => true,\n    'regex_path' => true,\n    'page_settings_hash' => true\n  ]\n  '[original]' => []\n  '[virtual]' => []\n  '[hasErrors] ' => true\n  '[errors]' => [\n    'page_settings_hash' => [\n      '_isUnique' => 'This value is already in use'\n    ]\n  ]\n  '[invalid]' => [\n    'page_settings_hash' => '44a9453b57d228884223347359a4b1cc'\n  ]\n  '[repository]' => 'CmsPa ges'\n}\n###########################`,
                duration: 0,
                flowId: 3580,
            });
        });
    });
});
