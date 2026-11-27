import { describe, expect, it } from 'vitest';
import { pestProject } from '../../tests/support/fixtures';
import { expectParsedBy } from '../../tests/support/outputParser';
import { TestOutputParser } from './TestOutputParser';
import { TeamcityEvent } from './types';

describe('TestOutputParser on a full Pest teamcity stream', () => {
    describe('Teamcity Life Cycle', () => {
        const expectParsed = expectParsedBy(new TestOutputParser());

        it('testSuiteStarted phpunit.xml', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: pestProject('phpunit.xml'),
                    name: pestProject('phpunit.xml'),
                    flowId: 68573,
                },
            );
        });

        it('testCount', () => {
            expectParsed(`##teamcity[testCount count='7' flowId='68573']`, {
                event: TeamcityEvent.testCount,
                count: 7,
                flowId: 68573,
            });
        });

        it('testSuiteStarted Test Suite', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Test Suite' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Test Suite',
                    name: 'Test Suite',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted Tests\\Feature\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Tests\\Feature\\ExampleTest',
                    name: 'Tests\\Feature\\ExampleTest',
                    flowId: 68573,
                },
            );
        });

        it('testStarted', () => {
            expectParsed(
                `##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Feature\\Example)::Example' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'Example (Tests\\Feature\\Example)::Example',
                    name: 'Example',
                    flowId: 68573,
                },
            );
        });

        it('testFinished', () => {
            expectParsed(`##teamcity[testFinished name='Example' duration='1' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'Example (Tests\\Feature\\Example)::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Feature\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'Tests\\Feature\\ExampleTest',
                    name: 'Tests\\Feature\\ExampleTest',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted tests/Fixtures/CollisionTest.php', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://tests/Fixtures/CollisionTest.php' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testStarted tests/Fixtures/CollisionTest.php::error', () => {
            expectParsed(
                `##teamcity[testStarted name='error' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::error' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/CollisionTest.php::error',
                    name: 'error',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testFinished tests/Fixtures/CollisionTest.php::error', () => {
            expectParsed(
                `##teamcity[testFailed name='error' message='Exception: error' details='at tests/Fixtures/CollisionTest.php:4' flowId='68573']`,
                undefined,
            );

            expectParsed(`##teamcity[testFinished name='error' duration='3' flowId='68573']`, {
                event: TeamcityEvent.testFailed,
                id: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                message: 'Exception: error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
                details: [
                    {
                        file: 'tests/Fixtures/CollisionTest.php',
                        line: 4,
                    },
                ],
            });
        });

        it('testStarted tests/Fixtures/CollisionTest.php::success', () => {
            expectParsed(
                `##teamcity[testStarted name='success' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::success' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/CollisionTest.php::success',
                    name: 'success',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testFinished tests/Fixtures/CollisionTest.php::success', () => {
            expectParsed(`##teamcity[testFinished name='success' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Fixtures/CollisionTest.php', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                    file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            expectParsed(
                `##teamcity[testStarted name='it example 1' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                    name: 'it example 1',
                    file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            expectParsed(
                `##teamcity[testFinished name='it example 1' duration='0' flowId='68573']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                    name: 'it example 1',
                    file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                    file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted tests/Fixtures/ExampleTest.php', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://tests/Fixtures/ExampleTest.php' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Fixtures/ExampleTest.php',
                    name: 'Tests\\Unit\\ExampleTest',
                    file: 'tests/Fixtures/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testStarted tests/Fixtures/ExampleTest.php::it example 2', () => {
            expectParsed(
                `##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests/Fixtures/ExampleTest.php::it example 2' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/ExampleTest.php::it example 2',
                    name: 'it example 2',
                    file: 'tests/Fixtures/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
            expectParsed(
                `##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'tests/Fixtures/ExampleTest.php::it example 2',
                    name: 'it example 2',
                    file: 'tests/Fixtures/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteFinished Tests\\Unit\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Fixtures/ExampleTest.php',
                    name: 'Tests\\Unit\\ExampleTest',
                    file: 'tests/Fixtures/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                    name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            expectParsed(
                `##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                    name: 'Example',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testIgnored Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            expectParsed(
                `##teamcity[testIgnored name='Example' message='This test was ignored.' details='' flowId='68573']`,
                undefined,
            );

            expectParsed(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testIgnored,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                name: 'Example',
                message: 'This test was ignored.',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                    name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                    name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            expectParsed(
                `##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)::Example' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                    name: 'Example',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testFinished Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            expectParsed(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\ExampleTest' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                    name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('testSuiteFinished Test Suite', () => {
            expectParsed(`##teamcity[testSuiteFinished name='Test Suite' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Test Suite',
                name: 'Test Suite',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished phpunit.xml', () => {
            expectParsed(
                `##teamcity[testSuiteFinished name='${pestProject('phpunit.xml')}' flowId='68573']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: pestProject('phpunit.xml'),
                    name: pestProject('phpunit.xml'),
                    file: '',
                    flowId: 68573,
                },
            );
        });

        it('TestSummary', () => {
            expectParsed('  Tests:    1 failed, 1 skipped, 5 passed (5 assertions)', {
                event: TeamcityEvent.testResultSummary,
                passed: 5,
                failed: 1,
                skipped: 1,
                assertions: 5,
            });
        });

        it('TestDuration', () => {
            expectParsed('Duration: 0.04s', {
                event: TeamcityEvent.testDuration,
                text: 'Duration: 0.04s',
                time: '0.04s',
            });
        });
    });

    describe('multi-testsuite (locationHint with absolute path)', () => {
        const matcher = new TestOutputParser();
        const parse = (content: string) => matcher.parse(content);

        it('full lifecycle: testSuiteStarted → testStarted → testFailed → testFinished', () => {
            const suiteStarted = parse(
                `##teamcity[testSuiteStarted name='Unit' locationHint='pest_qn://${pestProject('tests/Unit/ArchTest.php')}' flowId='36903']`,
            );
            expect(suiteStarted).toEqual(
                expect.objectContaining({
                    event: TeamcityEvent.testSuiteStarted,
                    name: 'Unit',
                    flowId: 36903,
                }),
            );

            parse(
                `##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://${pestProject('tests/Unit/ExampleTest.php')}' flowId='36903']`,
            );

            const started = parse(
                `##teamcity[testStarted name='test description' locationHint='pest_qn://${pestProject('tests/Unit/ExampleTest.php')}::test description' flowId='36903']`,
            );
            expect(started).toEqual(
                expect.objectContaining({
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Unit/ExampleTest.php::test description',
                    name: 'test description',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 36903,
                }),
            );

            const failed = parse(
                `##teamcity[testFailed name='test description' message='Failed asserting that true is identical to false.' details='at ${pestProject('tests/Unit/ExampleTest.php')}:4' flowId='36903']`,
            );
            expect(failed).toBeUndefined();

            const finished = parse(
                `##teamcity[testFinished name='test description' duration='1' flowId='36903']`,
            );
            expect(finished).toEqual(
                expect.objectContaining({
                    event: TeamcityEvent.testFailed,
                    id: 'tests/Unit/ExampleTest.php::test description',
                    flowId: 36903,
                }),
            );
        });
    });
});
