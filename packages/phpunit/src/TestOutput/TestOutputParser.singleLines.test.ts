import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { phpUnitProjectWin } from '../../test-support/windowsPath';
import { TestOutputParser } from './TestOutputParser';
import { TeamcityEvent } from './types';

describe('TestOutputParser on single output lines', () => {
    const parse = (text: string) => {
        return new TestOutputParser().parse(text);
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
            passed: 1,
            text,
        });
    });

    it('parse test result', () => {
        const text =
            'Tests: 19, Assertions: 15, Errors: 2, Failures: 4, Skipped: 1, Incomplete: 1, Risky: 2.';

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testResultSummary,
            tests: 19,
            assertions: 15,
            errors: 2,
            failures: 4,
            skipped: 1,
            incomplete: 1,
            risky: 2,
            failed: 6,
            passed: 11,
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
            passed: 1,
            text,
        });
    });

    it('parse addition_provider with data set with number key', () => {
        const text = `##teamcity[testStarted name='addition_provider with data set #2' locationHint='php_qn://${phpUnitProjectWin('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::addition_provider with data set #2' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #2',
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
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
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
        it('case 2', () => {
            const text = `##teamcity[testFailed name='testCreateEntityWithExceptPathEmptyString' message='ROOT/tests/TestCase/Model/Table/Validation/CmsPagesTableValidationTest.php (line 264)|n########## DEBUG ##########|nobject(AppModelEntityCmsPage) id:0 {|n  |'page_name|' => |'cms_page_639ca3c184af3|'|n  |'valid_for_pages|' => (int) 1|n  |'except_path|' => null|n  |'regex_path|' => null|n  |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |'|[new|]|' => true|n  |'|[accessible|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true|n  |]|n  |'|[dirty|]|' => |[|n    |'page_name|' => true,|n    |'valid_for_pages|' => true,|n    |'except_path|' => true,|n    |'regex_path|' => true,|n    |'page_settings_hash|' => true|n  |]|n  |'|[original|]|' => |[|]|n  |'|[virtual|]|' => |[|]|n  |'|[hasErrors|] |' => true|n  |'|[errors|]|' => |[|n    |'page_settings_hash|' => |[|n      |'_isUnique|' => |'This value is already in use|'|n    |]|n  |]|n  |'|[invalid|]|' => |[|n    |'page_settings_hash|' => |'44a9453b57d228884223347359a4b1cc|'|n  |]|n  |'|[repository|]|' => |'CmsPa ges|'|n}|n###########################' details=' |n Caused by|n ErrorException: unserialize(): Error at offset 0 of 919 bytes|n |n ' duration='0' flowId='3580']`;

            expect(parse(text) as Record<string, unknown>).toEqual({
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
