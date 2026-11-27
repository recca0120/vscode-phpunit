import { beforeEach, describe, it } from 'vitest';
import { expectParsedBy } from '../../test-support/outputParser';
import { TestOutputParser } from './TestOutputParser';
import { TeamcityEvent } from './types';

describe('TestOutputParser on Pest output edge cases', () => {
    let parser: TestOutputParser;
    beforeEach(() => {
        parser = new TestOutputParser();
    });
    const expectParsed = (content: string, expected: Record<string, unknown> | undefined) =>
        expectParsedBy(parser)(content, expected);

    describe('on Windows', () => {
        const expectParsed = expectParsedBy(new TestOutputParser());

        it('For Windows testStarted tests\\Fixtures\\ExampleTest.php::it example 2', () => {
            expectParsed(
                `##teamcity[testStarted name='it example 2' locationHint='pest_qn://tests\\Fixtures\\ExampleTest.php::it example 2' flowId='68573']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/ExampleTest.php::it example 2',
                    name: 'it example 2',
                    file: 'tests/Fixtures/ExampleTest.php',
                    flowId: 68573,
                },
            );
        });

        it('For Windows testFinished tests/Fixtures/ExampleTest.php::it example 2', () => {
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
    });

    it('multi-word class names', () => {
        expectParsed(
            `##teamcity[testStarted name='Login screen can be rendered' locationHint='pest_qn://Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered' flowId='72545']`,
            {
                event: TeamcityEvent.testStarted,
                id: 'Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered',
                flowId: 72545,
            },
        );

        expectParsed(
            `##teamcity[testFinished name='Login screen can be rendered' duration='1' flowId='72545']`,
            {
                event: TeamcityEvent.testFinished,
                id: 'Authentication Page (Tests\\Feature\\AuthenticationPage)::Login screen can be rendered',
                flowId: 72545,
            },
        );
    });

    it('testFailed without TestStarted', () => {
        expectParsed(
            `##teamcity[testFailed name='error' message='Exception: error' details='at tests/Fixtures/CollisionTest.php:4' flowId='68573']`,
            {
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
            },
        );
    });

    it('testFinished without TestStarted', () => {
        expectParsed(
            "##teamcity[testFinished name='`before each` → example' duration='12' flowId='97972']",
            undefined,
        );
    });

    it('reports a testIgnored that arrives without testStarted', () => {
        expectParsed(
            `##teamcity[testSuiteStarted name='Tests\\Feature\\AuthenticationTest' locationHint='pest_qn://Authentication (Tests\\Feature\\Authentication)' flowId='6611']`,
            {},
        );
        expectParsed(`##teamcity[testCount count='1' flowId='6611']`, {});
        expectParsed(
            `##teamcity[testIgnored name='Login screen can be rendered' message='This test was ignored.' details='' flowId='6611']`,
            {
                event: TeamcityEvent.testIgnored,
                flowId: 6611,
                id: 'Authentication (Tests\\Feature\\Authentication)::Login screen can be rendered',
                name: 'Login screen can be rendered',
                message: 'This test was ignored.',
                duration: 0,
            },
        );
        expectParsed(
            `##teamcity[testSuiteFinished name='Tests\\Feature\\AuthenticationTest' flowId='6611']`,
            {},
        );
    });
});
