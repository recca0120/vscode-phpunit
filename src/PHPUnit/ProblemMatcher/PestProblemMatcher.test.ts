import { pestProject } from '../__tests__/utils';
import { ProblemMatcher } from './ProblemMatcher';
import { TeamcityEvent } from './types';

const problemMatcher = new ProblemMatcher();

describe('Pest ProblemMatcher Text', () => {
    const resultShouldBe = (content: string, expected: any) => {
        const actual = problemMatcher.parse(content);

        if (expected === undefined) {
            expect(actual).toBeUndefined();
        } else {
            expect(actual).toEqual(expect.objectContaining(expected));
        }
    };

    describe('Teamcity Life Cycle', () => {
        it('testSuiteStarted phpunit.xml', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                flowId: 68573,
            });
        });

        it('testCount', () => {
            resultShouldBe(`##teamcity[testCount count='7' flowId='68573']`, {
                event: TeamcityEvent.testCount,
                count: 7,
                flowId: 68573,
            });
        });

        it('testSuiteStarted Test Suite', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Test Suite' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Test Suite',
                name: 'Test Suite',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Feature\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Example (Tests\\Feature\\Example)' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Tests\\Feature\\ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 68573,
            });
        });

        it('testStarted', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Feature\\Example)::Example' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'Example (Tests\\Feature\\Example)::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testFinished', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='1' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'Example (Tests\\Feature\\Example)::Example',
                name: 'Example',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Feature\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Tests\\Feature\\ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://tests/Fixtures/CollisionTest.php' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testStarted name='error' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::error' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinish tests/Fixtures/CollisionTest.php::error', () => {
            resultShouldBe(`##teamcity[testFailed name='error' message='Exception: error' details='at tests/Fixtures/CollisionTest.php:4' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='error' duration='3' flowId='68573']`, {
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
            resultShouldBe(`##teamcity[testStarted name='success' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::success' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/CollisionTest.php::success', () => {
            resultShouldBe(`##teamcity[testFinished name='success' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 1' locationHint='pest_qn://tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 1' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php::it example 1',
                name: 'it example 1',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished tests/Fixtures/DirectoryWithTests/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\DirectoryWithTests\\ExampleTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                name: 'Tests\\Fixtures\\DirectoryWithTests\\ExampleTest',
                file: 'tests/Fixtures/DirectoryWithTests/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted tests/Fixtures/ExampleTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest' locationHint='pest_qn://tests/Fixtures/ExampleTest.php' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Fixtures/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testStarted tests/Fixtures/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests/Fixtures/ExampleTest.php::it example 2' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
            resultShouldBe(`##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/ExampleTest.php::it example 2',
                name: 'it example 2',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Unit\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Fixtures/ExampleTest.php',
                name: 'Tests\\Unit\\ExampleTest',
                file: 'tests/Fixtures/ExampleTest.php',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testIgnored Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testIgnored name='Example' message='This test was ignored.' details='' flowId='68573']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testIgnored,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Base\\Example)::Example',
                name: 'Example',
                message: 'This test was ignored.',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\Base\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\Base\\ExampleTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\Base\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteStarted Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\Inheritance\\ExampleTest' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)' flowId='68573']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testStarted Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testStarted name='Example' locationHint='pest_qn://Example (Tests\\Fixtures\\Inheritance\\Example)::Example' flowId='68573']`, {
                event: TeamcityEvent.testStarted,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testFinished Example (Tests\\Fixtures\\Inheritance\\Example)::Example', () => {
            resultShouldBe(`##teamcity[testFinished name='Example' duration='0' flowId='68573']`, {
                event: TeamcityEvent.testFinished,
                id: 'Example (Tests\\Fixtures\\Inheritance\\Example)::Example',
                name: 'Example',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Tests\\Fixtures\\Inheritance\\ExampleTest', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\Inheritance\\ExampleTest' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                name: 'Tests\\Fixtures\\Inheritance\\ExampleTest',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished Test Suite', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='Test Suite' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Test Suite',
                name: 'Test Suite',
                file: '',
                flowId: 68573,
            });
        });

        it('testSuiteFinished phpunit.xml', () => {
            resultShouldBe(`##teamcity[testSuiteFinished name='${pestProject('phpunit.xml')}' flowId='68573']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                file: '',
                flowId: 68573,
            });
        });

        it('TestSummary', () => {
            resultShouldBe('  Tests:    1 failed, 1 skipped, 5 passed (5 assertions)', {
                event: TeamcityEvent.testResultSummary,
                passed: 5,
                failed: 1,
                skipped: 1,
                assertions: 5,
            });
        });

        it('TestDuration', () => {
            resultShouldBe('Duration: 0.04s', {
                event: TeamcityEvent.testDuration,
                text: 'Duration: 0.04s',
                time: '0.04s',
            });
        });
    });

    it('name has */', () => {
        resultShouldBe(`##teamcity[testStarted name='test /** with comment {@*} should do' locationHint='pest_qn://tests/Unit/ExampleTest.php::test /** with comment {@*} should do' flowId='28391']`, {
            event: TeamcityEvent.testStarted,
            id: 'tests/Unit/ExampleTest.php::test /** with comment */ should do',
            name: 'test /** with comment {@*} should do',
            flowId: 28391,
        });

        resultShouldBe(`##teamcity[testFailed name='test /** with comment {@*} should do' message='Failed asserting that true is identical to false.' details='at tests/Unit/ExampleTest.php:196' flowId='28391']`, undefined);

        resultShouldBe(`##teamcity[testFinished name='test /** with comment {@*} should do' duration='0' flowId='28391']`, {
            event: TeamcityEvent.testFailed,
            id: 'tests/Unit/ExampleTest.php::test /** with comment */ should do',
            name: 'test /** with comment {@*} should do',
            flowId: 28391,
        });
    });

    it('with dataset', () => {
        resultShouldBe(`##teamcity[testSuiteStarted name='Addition provider' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider' flowId='53556']`, {
            event: TeamcityEvent.testSuiteStarted,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set ""foo-bar_%$"' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"' flowId='53556']`, {
            event: TeamcityEvent.testStarted,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set ""foo-bar_%$"',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set ""foo-bar_%$"' duration='0' flowId='53556']`, {
            event: TeamcityEvent.testFinished,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set ""foo-bar_%$"',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set #0' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0' flowId='53556']`, {
            event: TeamcityEvent.testStarted,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set #0',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set #0' duration='0' flowId='53556']`, {
            event: TeamcityEvent.testFinished,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set #0',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testStarted name='Addition provider with data set #1' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1' flowId='53556']`, {
            event: TeamcityEvent.testStarted,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set #1',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testFailed name='Addition provider with data set #1' message='Failed asserting that 1 matches expected 2.' details='at tests/AssertionsTest.php:62' type='comparisonFailure' actual='1' expected='2' flowId='53556']`, undefined);

        resultShouldBe(`##teamcity[testFinished name='Addition provider with data set #1' duration='0' flowId='53556']`, {
            event: TeamcityEvent.testFailed,
            // id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider with data set #1',
            flowId: 53556,
        });

        resultShouldBe(`##teamcity[testSuiteFinished name='Addition provider' flowId='53556']`, {
            event: TeamcityEvent.testSuiteFinished,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider',
            flowId: 53556,
        });
    });

    it('describe with dataset', () => {
        resultShouldBe(`##teamcity[testSuiteStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' flowId='11847']`, {
            event: TeamcityEvent.testSuiteStarted,
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it ha',
            name: '`abc` → `def` → `ijk` → `lmn` → it ha',
            flowId: 11847,
        });

        resultShouldBe(`##teamcity[testStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' flowId='11847']`, {
            event: TeamcityEvent.testStarted,
            // id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails',
            name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
            flowId: 11847,
        });

        resultShouldBe(`##teamcity[testFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' duration='9' flowId='11847']`, {
            event: TeamcityEvent.testFinished,
            // id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails',
            name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
            flowId: 11847,
        });

        resultShouldBe(`##teamcity[testStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' flowId='11847']`, {
            event: TeamcityEvent.testStarted,
            // id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails',
            name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
            flowId: 11847,
        });

        resultShouldBe(`##teamcity[testFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' duration='0' flowId='11847']`, {
            event: TeamcityEvent.testFinished,
            // id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails',
            name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
            flowId: 11847,
        });

        resultShouldBe(`##teamcity[testSuiteFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' flowId='11847']`, {
            event: TeamcityEvent.testSuiteFinished,
            id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it ha',
            name: '`abc` → `def` → `ijk` → `lmn` → it ha',
            flowId: 11847,
        });
    });

    it('For Windows testStarted tests\\Fixtures\\ExampleTest.php::it example 2', () => {
        resultShouldBe(`##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests\\Fixtures\\ExampleTest.php::it example 2' flowId='68573']`, {
            event: TeamcityEvent.testStarted,
            id: 'tests/Fixtures/ExampleTest.php::it example 2',
            name: 'it example 2',
            file: 'tests/Fixtures/ExampleTest.php',
            flowId: 68573,
        });
    });

    it('For Windows testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
        resultShouldBe(`##teamcity[testFinished name='it example 2' duration='0' flowId='68573']`, {
            event: TeamcityEvent.testFinished,
            id: 'tests/Fixtures/ExampleTest.php::it example 2',
            name: 'it example 2',
            file: 'tests/Fixtures/ExampleTest.php',
            flowId: 68573,
        });
    });

    describe('Pest v2', () => {
        it('testSuiteStarted phpunit.xml and locationHint prefix is file://', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: pestProject('phpunit.xml'),
                name: pestProject('phpunit.xml'),
                flowId: 57317,
            });
        });

        it('testSuiteStarted Test Suite and locationHint prefix is file://', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Test Suite' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Test Suite',
                name: 'Test Suite',
                flowId: 57317,
            });
        });

        it('pest-v2 tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='file://tests/Fixtures/CollisionTest.php' flowId='57317']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testStarted name='success' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::success' flowId='57317']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testFinished name='success' duration='0' flowId='57317']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' flowId='57317']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 57317,
            });
        });

        it('pest-v2 data set', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails' locationHint='file://tests/Unit/ExampleTest.php' flowId='57317']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                name: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testStarted name='it has emails with data set "(|'enunomaduro@gmail.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::it has emails with data set "(|'enunomaduro@gmail.com|')"' flowId='57317']`, {
                event: TeamcityEvent.testStarted,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with data set "(\'enunomaduro@gmail.com\')"',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testFinished name='it has emails with data set "(|'enunomaduro@gmail.com|')"' duration='1' flowId='57317']`, {
                event: TeamcityEvent.testFinished,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with data set "(\'enunomaduro@gmail.com\')"',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testStarted name='it has emails with data set "(|'other@example.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::it has emails with data set "(|'other@example.com|')"' flowId='57317']`, {
                event: TeamcityEvent.testStarted,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'other@example.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with data set "(\'other@example.com\')"',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testFinished name='it has emails with data set "(|'other@example.com|')"' duration='0' flowId='57317']`, {
                event: TeamcityEvent.testFinished,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'other@example.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with data set "(\'other@example.com\')"',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });

            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails' flowId='57317']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                name: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 57317,
            });
        });
    });

    describe('Pest v1', () => {
        it('Pest v1 TestDuration', () => {
            resultShouldBe('Time:  0.013558585s', {
                event: TeamcityEvent.testDuration,
                text: 'Time:  0.013558585s',
                time: '0.013558585s',
            });
        });

        it('testStarted without flowId', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Tests\\Feature\\ExampleTest' flowId='58024']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Tests/Feature/ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 58024,
            });

            resultShouldBe(`##teamcity[testStarted name='test_example' locationHint='php_qn://${pestProject('tests/Feature/ExampleTest.php')}::\\Tests\\Feature\\ExampleTest::test_example']`, {
                event: TeamcityEvent.testStarted,
                id: 'Example (Tests\\Feature\\Example)::Example',
                name: 'test_example',
                flowId: 58024,
            });

            resultShouldBe(`##teamcity[testFinished name='test_example' duration='1' flowId='58024']`, {
                event: TeamcityEvent.testFinished,
                id: 'Example (Tests\\Feature\\Example)::Example',
                name: 'test_example',
                flowId: 58024,
            });

            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Tests\\Feature\\ExampleTest' flowId='58024']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'Tests/Feature/ExampleTest',
                name: 'Tests\\Feature\\ExampleTest',
                flowId: 58024,
            });
        });

        it('pest-v1 tests/Fixtures/CollisionTest.php', () => {
            resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}' flowId='12667']`, {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                // file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testStarted name='error' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}::error' flowId='12667']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testIgnored name='error' message='' details=' /Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/pest-stub/tests/Fixtures/CollisionTest.php:5|n ' duration='6']`, undefined);

            resultShouldBe(`##teamcity[testFinished name='error' duration='6' flowId='12667']`, {
                event: TeamcityEvent.testIgnored,
                id: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testStarted name='success' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}::success' flowId='12667']`, {
                event: TeamcityEvent.testStarted,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testFinished name='success' duration='0' flowId='12667']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}' flowId='12667']`, {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Fixtures/CollisionTest.php',
                name: 'Tests\\Fixtures\\CollisionTest',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });
        });

        it('pest v1 data set', () => {
            resultShouldBe(`##teamcity[testStarted name='it has emails with (|'enunomaduro@gmail.com|')' locationHint='pest_qn:///Users/recca0120/Desktop/vscode-phpunit/src/PHPUnit/__tests__/fixtures/pest-stub/tests/Unit/ExampleTest.php::it has emails with (|'enunomaduro@gmail.com|')' flowId='12667']`, {
                event: TeamcityEvent.testStarted,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with (\'enunomaduro@gmail.com\')',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 12667,
            });

            resultShouldBe(`##teamcity[testFinished name='it has emails with (|'enunomaduro@gmail.com|')' duration='1' flowId='12667']`, {
                event: TeamcityEvent.testFinished,
                // id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                id: 'tests/Unit/ExampleTest.php::it has emails',
                name: 'it has emails with (\'enunomaduro@gmail.com\')',
                file: 'tests/Unit/ExampleTest.php',
                flowId: 12667,
            });
        });
    });

    it('multi-word class names', () => {
        resultShouldBe(`##teamcity[testStarted name='Login screen can be rendered' locationHint='pest_qn://Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered' flowId='72545']`, {
            event: TeamcityEvent.testStarted,
            id: 'Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered',
            flowId: 72545,
        });

        resultShouldBe(`##teamcity[testFinished name='Login screen can be rendered' duration='1' flowId='72545']`, {
            event: TeamcityEvent.testFinished,
            id: 'Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered',
            flowId: 72545,
        });
    });

    it('testFailed without TestStarted', () => {
        resultShouldBe(`##teamcity[testFailed name='error' message='Exception: error' details='at tests/Fixtures/CollisionTest.php:4' flowId='68573']`, {
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

    it('testFinished without TestStarted', () => {
        resultShouldBe('##teamcity[testFinished name=\'`before each` → example\' duration=\'12\' flowId=\'97972\']', undefined);
    });

    it('PHPUnit without TestStarted', () => {
        resultShouldBe(`##teamcity[testSuiteStarted name='Tests\\Feature\\AuthenticationTest' locationHint='pest_qn://Authentication (Tests\\Feature\\Authentication)' flowId='6611']`, {});
        resultShouldBe(`##teamcity[testCount count='1' flowId='6611']`, {});
        resultShouldBe(`##teamcity[testIgnored name='Login screen can be rendered' message='This test was ignored.' details='' flowId='6611']`, {
            event: TeamcityEvent.testIgnored,
            flowId: 6611,
            id: 'Authentication (Tests\\Feature\\Authentication)::Login screen can be rendered',
            name: 'Login screen can be rendered',
            message: 'This test was ignored.',
            duration: 0,
        });
        resultShouldBe(`##teamcity[testSuiteFinished name='Tests\\Feature\\AuthenticationTest' flowId='6611']`, {});
    });
});
