import { describe, it, expect } from '@jest/globals';
import { teamcityParser as parser } from '../../src/phpunit/problem-matcher';

describe('Problem Matcher Test', () => {
    describe('Teamcity Parser', () => {
        it('parse test_passed testStarted', async () => {
            const teamcity =
                "##teamcity[testStarted name='test_passed' locationHint='php_qn://C:Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed' flowId='8024']";

            expect(await parser.parse(teamcity)).toEqual({
                teamcity: 'testStarted',
                args: {
                    name: 'test_passed',
                    locationHint:
                        'php_qn://C:Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php::Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
                    flowId: 8024,
                },
            });
        });

        it('parse test_passed testFinished', async () => {
            const teamcity =
                "##teamcity[testFinished name='test_passed' duration='0' flowId='8024']";

            expect(await parser.parse(teamcity)).toEqual({
                teamcity: 'testFinished',
                args: {
                    name: 'test_passed',
                    duration: 0,
                    flowId: 8024,
                },
            });
        });

        it('parse test_failed testFailed', async () => {
            const teamcity =
                "##teamcity[testFailed name='test_failed' message='Failed asserting that false is true.' details=' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ' duration='0' flowId='8024'] ";

            expect(await parser.parse(teamcity)).toEqual({
                teamcity: 'testFailed',
                args: {
                    name: 'test_failed',
                    message: 'Failed asserting that false is true.',
                    details:
                        ' C:\\Users\\recca\\Desktop\\vscode-phpunit\\__tests__\\fixtures\\project-stub\\tests\\AssertionsTest.php:22|n ',
                    duration: 0,
                    flowId: 8024,
                },
            });
        });
    });
});
