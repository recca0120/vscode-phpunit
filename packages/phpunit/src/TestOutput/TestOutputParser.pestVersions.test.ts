import { beforeEach, describe, it } from 'vitest';
import { pestProject } from '../../test-support/fixtures';
import { expectParsedBy } from '../../test-support/outputParser';
import { TestOutputParser } from './TestOutputParser';
import { TeamcityEvent } from './types';

describe('TestOutputParser on Pest v1 and v2 output', () => {
    let parser: TestOutputParser;
    beforeEach(() => {
        parser = new TestOutputParser();
    });
    const expectParsed = (content: string, expected: Record<string, unknown> | undefined) =>
        expectParsedBy(parser)(content, expected);

    describe('Pest v2', () => {
        it('uses file:// location hints; the phpunit.xml suite keeps its path as id', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: pestProject('phpunit.xml'),
                    name: pestProject('phpunit.xml'),
                    flowId: 57317,
                },
            );
        });

        it('uses file:// location hints; the Test Suite suite keeps its name as id', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Test Suite' locationHint='file://Example (Tests\\Feature\\Example)' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Test Suite',
                    name: 'Test Suite',
                    flowId: 57317,
                },
            );
        });

        it('reports a test file suite by its relative file:// path', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='file://tests/Fixtures/CollisionTest.php' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testStarted name='success' locationHint='pest_qn://tests/Fixtures/CollisionTest.php::success' flowId='57317']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/CollisionTest.php::success',
                    name: 'success',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(`##teamcity[testFinished name='success' duration='0' flowId='57317']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 57317,
            });

            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 57317,
                },
            );
        });

        it('encodes the test name as __pest_evaluable_; the decoded name becomes the id', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails' locationHint='file://tests/Unit/ExampleTest.php' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Unit/ExampleTest.php::it has emails',
                    name: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testStarted name='it has emails with data set "(|'enunomaduro@gmail.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::it has emails with data set "(|'enunomaduro@gmail.com|')"' flowId='57317']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    name: 'it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testFinished name='it has emails with data set "(|'enunomaduro@gmail.com|')"' duration='1' flowId='57317']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    name: 'it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testStarted name='it has emails with data set "(|'other@example.com|')"' locationHint='pest_qn://tests/Unit/ExampleTest.php::it has emails with data set "(|'other@example.com|')"' flowId='57317']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'other@example.com\')"',
                    name: 'it has emails with data set "(\'other@example.com\')"',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testFinished name='it has emails with data set "(|'other@example.com|')"' duration='0' flowId='57317']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'other@example.com\')"',
                    name: 'it has emails with data set "(\'other@example.com\')"',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );

            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails' flowId='57317']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Unit/ExampleTest.php::it has emails',
                    name: 'Tests\\Unit\\ExampleTest::__pest_evaluable_it_has_emails',
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 57317,
                },
            );
        });
    });

    describe('Pest location hints holding only a file path', () => {
        it('keeps the phpunit.xml path as id', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='${pestProject('phpunit.xml')}' locationHint='pest_qn://tests/Unit/ArchTest.php' flowId='86988']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: pestProject('phpunit.xml'),
                    name: pestProject('phpunit.xml'),
                    flowId: 86988,
                },
            );
        });

        it('keeps a testsuite name as id', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Unit' locationHint='pest_qn://tests/Unit/ArchTest.php' flowId='86988']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Unit',
                    name: 'Unit',
                    flowId: 86988,
                },
            );
        });

        it('resolves a class suite to its file', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Unit\\ArchTest' locationHint='pest_qn://tests/Unit/ArchTest.php' flowId='86988']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Unit/ArchTest.php',
                    name: 'Tests\\Unit\\ArchTest',
                    file: 'tests/Unit/ArchTest.php',
                    flowId: 86988,
                },
            );
        });
    });

    describe('Pest v1', () => {
        it('prints the duration as Time: <seconds>s', () => {
            expectParsed('Time:  0.013558585s', {
                event: TeamcityEvent.testDuration,
                text: 'Time:  0.013558585s',
                time: '0.013558585s',
            });
        });

        it('omits flowId on testStarted; it is restored from the running suite', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Tests\\Feature\\ExampleTest' flowId='58024']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'Tests/Feature/ExampleTest',
                    name: 'Tests\\Feature\\ExampleTest',
                    flowId: 58024,
                },
            );

            expectParsed(
                `##teamcity[testStarted name='test_example' locationHint='php_qn://${pestProject('tests/Feature/ExampleTest.php')}::\\Tests\\Feature\\ExampleTest::test_example']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'Example (Tests\\Feature\\Example)::Example',
                    name: 'test_example',
                    flowId: 58024,
                },
            );

            expectParsed(
                `##teamcity[testFinished name='test_example' duration='1' flowId='58024']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'Example (Tests\\Feature\\Example)::Example',
                    name: 'test_example',
                    flowId: 58024,
                },
            );

            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Feature\\ExampleTest' locationHint='pest_qn://Tests\\Feature\\ExampleTest' flowId='58024']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'Tests/Feature/ExampleTest',
                    name: 'Tests\\Feature\\ExampleTest',
                    flowId: 58024,
                },
            );
        });

        it('reports absolute paths and a testIgnored without flowId', () => {
            expectParsed(
                `##teamcity[testSuiteStarted name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}' flowId='12667']`,
                {
                    event: TeamcityEvent.testSuiteStarted,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    flowId: 12667,
                },
            );

            expectParsed(
                `##teamcity[testStarted name='error' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}::error' flowId='12667']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/CollisionTest.php::error',
                    name: 'error',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 12667,
                },
            );

            expectParsed(
                `##teamcity[testIgnored name='error' message='' details=' ${pestProject('tests/Fixtures/CollisionTest.php')}:5|n ' duration='6']`,
                undefined,
            );

            expectParsed(`##teamcity[testFinished name='error' duration='6' flowId='12667']`, {
                event: TeamcityEvent.testIgnored,
                id: 'tests/Fixtures/CollisionTest.php::error',
                name: 'error',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            expectParsed(
                `##teamcity[testStarted name='success' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}::success' flowId='12667']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Fixtures/CollisionTest.php::success',
                    name: 'success',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 12667,
                },
            );

            expectParsed(`##teamcity[testFinished name='success' duration='0' flowId='12667']`, {
                event: TeamcityEvent.testFinished,
                id: 'tests/Fixtures/CollisionTest.php::success',
                name: 'success',
                file: 'tests/Fixtures/CollisionTest.php',
                flowId: 12667,
            });

            expectParsed(
                `##teamcity[testSuiteFinished name='Tests\\Fixtures\\CollisionTest' locationHint='pest_qn://${pestProject('tests/Fixtures/CollisionTest.php')}' flowId='12667']`,
                {
                    event: TeamcityEvent.testSuiteFinished,
                    id: 'tests/Fixtures/CollisionTest.php',
                    name: 'Tests\\Fixtures\\CollisionTest',
                    file: 'tests/Fixtures/CollisionTest.php',
                    flowId: 12667,
                },
            );
        });

        it('writes data sets as with (...); they become data set labels', () => {
            expectParsed(
                `##teamcity[testStarted name='it has emails with (|'enunomaduro@gmail.com|')' locationHint='pest_qn://${pestProject('tests/Unit/ExampleTest.php')}::it has emails with (|'enunomaduro@gmail.com|')' flowId='12667']`,
                {
                    event: TeamcityEvent.testStarted,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    name: "it has emails with ('enunomaduro@gmail.com')",
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 12667,
                },
            );

            expectParsed(
                `##teamcity[testFinished name='it has emails with (|'enunomaduro@gmail.com|')' duration='1' flowId='12667']`,
                {
                    event: TeamcityEvent.testFinished,
                    id: 'tests/Unit/ExampleTest.php::it has emails with data set "(\'enunomaduro@gmail.com\')"',
                    name: "it has emails with ('enunomaduro@gmail.com')",
                    file: 'tests/Unit/ExampleTest.php',
                    flowId: 12667,
                },
            );
        });
    });
});
