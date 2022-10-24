import { describe, it, expect } from '@jest/globals';
import { teamcityParser as parser } from '../../src/phpunit/problem-matcher';

describe('Problem Matcher Test', () => {
    describe('Teamcity Parser', () => {
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
    });
});
