import { describe, expect, it } from 'vitest';
import { phpUnitProjectWin } from '../../test-support/windowsPath';
import { OutputLineParser } from './OutputLineParser';
import { TeamcityEvent } from './types';

describe('OutputLineParser', () => {
    const parse = (text: string) => {
        return new OutputLineParser().parse(text);
    };

    it('parse default testSuiteFinished', () => {
        const text = `##teamcity[testSuiteFinished name='default' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testSuiteFinished,
            name: 'default',
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
        const text = `##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:27|n ' duration='0' flowId='8024'] `;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            message: 'Failed asserting that false is true.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 27,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_is_not_same testFailed', () => {
        const text = `##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:32|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_is_not_same',
            message: 'Failed asserting that two arrays are identical.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 32,
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
            message:
                'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called\r\n exactly 1 times but called 0 times.',
            details: [
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php',
                    ),
                    line: 38,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Expectation.php',
                    ),
                    line: 308,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/ExpectationDirector.php',
                    ),
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
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php',
                    ),
                    line: 68,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php',
                    ),
                    line: 43,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php',
                    ),
                    line: 29,
                },
            ],
            duration: 13,
            flowId: 8024,
        });
    });

    it('parse test_skipped testIgnored', () => {
        const text = `##teamcity[testIgnored name='test_skipped' message='The MySQLi extension is not available.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:51|n ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            message: 'The MySQLi extension is not available.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 51,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_incomplete testIgnored', () => {
        const text = `##teamcity[testIgnored name='test_incomplete' message='This test has not been implemented yet.' details=' ${phpUnitProjectWin('tests/AssertionsTest.php')}:56|n ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testIgnored,
            name: 'test_incomplete',
            message: 'This test has not been implemented yet.',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 56,
                },
            ],
            duration: 0,
            flowId: 8024,
        });
    });

    it('parse test_risky testFailed', () => {
        const text = `##teamcity[testFailed name='test_risky' message='This test did not perform any assertions|n|n${phpUnitProjectWin('tests/AssertionsTest.php')}:35' details=' ' duration='0' flowId='8024']`;

        expect(parse(text)).toEqual({
            event: TeamcityEvent.testFailed,
            name: 'test_risky',
            message: 'This test did not perform any assertions',
            details: [
                {
                    file: phpUnitProjectWin('tests/AssertionsTest.php'),
                    line: 35,
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
            message:
                'Illuminate\\Database\\QueryException : SQLSTATE[HY000]: General error: 1 no such table: roles (SQL: select * from "roles" where "roles"."id" = 1 and "roles"."deleted_at" is null limit 1)',
            details: [
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/CountValidator/Exact.php',
                    ),
                    line: 38,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Expectation.php',
                    ),
                    line: 308,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/ExpectationDirector.php',
                    ),
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
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php',
                    ),
                    line: 68,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegration.php',
                    ),
                    line: 43,
                },
                {
                    file: phpUnitProjectWin(
                        'vendor/mockery/mockery/library/Mockery/Adapter/Phpunit/MockeryPHPUnitIntegrationAssertPostConditions.php',
                    ),
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
    });
});
