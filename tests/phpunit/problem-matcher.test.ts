import { describe, it, expect } from '@jest/globals';
import { teamcityParser as parser } from '../../src/phpunit/problem-matcher';

describe('Problem Matcher Test', () => {
    describe('Teamcity Parser', () => {
        it('parse testCount', () => {
            const teamcity = "##teamcity[testCount count='19' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testCount',
                count: 19,
                flowId: 8024,
            });
        });

        it('parse default testSuiteStarted', () => {
            const teamcity = "##teamcity[testSuiteStarted name='default' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testSuiteStarted',
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse default testSuiteFinished', () => {
            const teamcity = "##teamcity[testSuiteFinished name='default' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testSuiteFinished',
                name: 'default',
                flowId: 8024,
            });
        });

        it('parse test_passed testStarted', () => {
            const teamcity =
                "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testStarted',
                name: 'test_passed',
                locationHint:
                    'php_qn://C:Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                flowId: 8024,
            });
        });

        it('parse test_passed testFinished', () => {
            const teamcity =
                "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testFinished',
                name: 'test_passed',
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_failed testFailed', () => {
            const teamcity =
                "##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ' duration='0' flowId='8024'] ";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testFailed',
                name: 'test_failed',
                message: 'Failed asserting that false is true.',
                details:
                    ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ',
                duration: 0,
                flowId: 8024,
            });
        });

        it('parse test_is_not_same testFailed', () => {
            const teamcity =
                "##teamcity[testFailed name='test_is_not_same' message='Failed asserting that two arrays are identical.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:27|n ' duration='0' type='comparisonFailure' actual='Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)' expected='Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testFailed',
                name: 'test_is_not_same',
                message: 'Failed asserting that two arrays are identical.',
                details:
                    ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:27|n ',
                duration: 0,
                type: 'comparisonFailure',
                actual: "Array &0 (|n    |'e|' => |'f|'|n    0 => |'g|'|n    1 => |'h|'|n)",
                expected: "Array &0 (|n    |'a|' => |'b|'|n    |'c|' => |'d|'|n)",
                flowId: 8024,
            });
        });

        it('parse test_sum_item_method_not_call testFailed', () => {
            const teamcity =
                "##teamcity[testFailed name='test_sum_item_method_not_call' message='Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called|r|n exactly 1 times but called 0 times.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ' duration='13' flowId='8024']";

            expect(parser.parse(teamcity)).toEqual({
                teamcity: 'testFailed',
                name: 'test_sum_item_method_not_call',
                message:
                    'Mockery\\Exception\\InvalidCountException : Method test(<Any Arguments>) from Mockery_0_Recca0120_VSCode_Item_Recca0120_VSCode_Item should be called|r|n exactly 1 times but called 0 times.',
                details:
                    ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\CountValidator\\Exact.php:38|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Expectation.php:308|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\ExpectationDirector.php:119|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:299|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Container.php:284|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery.php:204|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:68|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegration.php:43|n C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\vendor\\mockery\\mockery\\library\\Mockery\\Adapter\\Phpunit\\MockeryPHPUnitIntegrationAssertPostConditions.php:29|n ',
                duration: 13,
                flowId: 8024,
            });
        });
    });
});
