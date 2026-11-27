import { beforeEach, describe, it } from 'vitest';
import { expectParsedBy } from '../../test-support/outputParser';
import { TestOutputParser } from './TestOutputParser';
import { TeamcityEvent } from './types';

describe('TestOutputParser on Pest data sets', () => {
    let parser: TestOutputParser;
    beforeEach(() => {
        parser = new TestOutputParser();
    });
    const expectParsed = (content: string, expected: Record<string, unknown> | undefined) =>
        expectParsedBy(parser)(content, expected);

    it('name has */', () => {
        expectParsed(
            `##teamcity[testStarted name='test /** with comment {@*} should do' locationHint='pest_qn://tests/Unit/ExampleTest.php::test /** with comment {@*} should do' flowId='28391']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'tests/Unit/ExampleTest.php::test /** with comment */ should do',
                name: 'test /** with comment {@*} should do',
                flowId: 28391,
            },
        );

        expectParsed(
            `##teamcity[testFailed name='test /** with comment {@*} should do' message='Failed asserting that true is identical to false.' details='at tests/Unit/ExampleTest.php:196' flowId='28391']`,
            undefined,
        );

        expectParsed(
            `##teamcity[testFinished name='test /** with comment {@*} should do' duration='0' flowId='28391']`,
            {
                event: TeamcityEvent.testFailed,
                id: 'tests/Unit/ExampleTest.php::test /** with comment */ should do',
                name: 'test /** with comment {@*} should do',
                flowId: 28391,
            },
        );
    });

    it('with dataset', () => {
        expectParsed(
            `##teamcity[testSuiteStarted name='Addition provider' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider' flowId='53556']`,
            {
                event: TeamcityEvent.testSuiteStarted,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
                name: 'Addition provider',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testStarted name='Addition provider with data set ""foo-bar_%$"' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"' flowId='53556']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
                name: 'Addition provider with data set ""foo-bar_%$"',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testFinished name='Addition provider with data set ""foo-bar_%$"' duration='0' flowId='53556']`,
            {
                event: TeamcityEvent.testFinished,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set ""foo-bar_%$"',
                name: 'Addition provider with data set ""foo-bar_%$"',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testStarted name='Addition provider with data set #0' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0' flowId='53556']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
                name: 'Addition provider with data set #0',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testFinished name='Addition provider with data set #0' duration='0' flowId='53556']`,
            {
                event: TeamcityEvent.testFinished,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #0',
                name: 'Addition provider with data set #0',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testStarted name='Addition provider with data set #1' locationHint='pest_qn://Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1' flowId='53556']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
                name: 'Addition provider with data set #1',
                flowId: 53556,
            },
        );

        expectParsed(
            `##teamcity[testFailed name='Addition provider with data set #1' message='Failed asserting that 1 matches expected 2.' details='at tests/AssertionsTest.php:62' type='comparisonFailure' actual='1' expected='2' flowId='53556']`,
            undefined,
        );

        expectParsed(
            `##teamcity[testFinished name='Addition provider with data set #1' duration='0' flowId='53556']`,
            {
                event: TeamcityEvent.testFailed,
                id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider with data set #1',
                name: 'Addition provider with data set #1',
                flowId: 53556,
            },
        );

        expectParsed(`##teamcity[testSuiteFinished name='Addition provider' flowId='53556']`, {
            event: TeamcityEvent.testSuiteFinished,
            id: 'Assertions (Recca0120\\VSCode\\Tests\\Assertions)::Addition provider',
            name: 'Addition provider',
            flowId: 53556,
        });
    });

    it('describe with dataset', () => {
        expectParsed(
            `##teamcity[testSuiteStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' flowId='11847']`,
            {
                event: TeamcityEvent.testSuiteStarted,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it ha',
                name: '`abc` → `def` → `ijk` → `lmn` → it ha',
                flowId: 11847,
            },
        );

        expectParsed(
            `##teamcity[testStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' flowId='11847']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
                name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
                flowId: 11847,
            },
        );

        expectParsed(
            `##teamcity[testFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'enunomaduro@gmail.com|')"' duration='9' flowId='11847']`,
            {
                event: TeamcityEvent.testFinished,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
                name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'enunomaduro@gmail.com\')"',
                flowId: 11847,
            },
        );

        expectParsed(
            `##teamcity[testStarted name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' flowId='11847']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
                name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
                flowId: 11847,
            },
        );

        expectParsed(
            `##teamcity[testFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it has emails with data set "(|'other@example.com|')"' duration='0' flowId='11847']`,
            {
                event: TeamcityEvent.testFinished,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
                name: '`abc` → `def` → `ijk` → `lmn` → it has emails with data set "(\'other@example.com\')"',
                flowId: 11847,
            },
        );

        expectParsed(
            `##teamcity[testSuiteFinished name='\`abc\` → \`def\` → \`ijk\` → \`lmn\` → it ha' flowId='11847']`,
            {
                event: TeamcityEvent.testSuiteFinished,
                id: 'tests/Unit/ExampleTest.php::`abc` → `def` → `ijk` → `lmn` → it ha',
                name: '`abc` → `def` → `ijk` → `lmn` → it ha',
                flowId: 11847,
            },
        );
    });
});
