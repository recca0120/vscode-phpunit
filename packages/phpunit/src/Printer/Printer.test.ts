import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { PHPUnitXML } from '../Configuration/PHPUnitXML';
import {
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestProcesses,
    type TestResultSummary,
    type TestRuntime,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
    type TestVersion,
} from '../TestOutput/types';
import { EOL } from '../utils';
import { Printer } from './Printer';
import {
    PRESET_COLLISION,
    PRESET_PRETTY,
    PRESET_PROGRESS,
    type PrinterFormat,
    resolveFormat,
} from './PrinterConfig';
import { fileFormat } from './SourceFileReader';

describe('Printer with custom started/duration/summary format', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const format = resolveFormat('collision', {
        colors: false,
        started: '{name}',
        duration: '{icon} {text}',
        resultSummary: '{icon} {text}',
    });
    const printer = new Printer(phpUnitXML, format);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('testStarted returns formatted name', () => {
        const output = printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_something',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_something',
            file: '',
        } as TestStarted);

        expect(output).toEqual(`test_something${EOL}`);
    });

    it('timeAndMemory uses format template', () => {
        const output = printer.timeAndMemory({
            text: 'Time: 00:00.123, Memory: 10.00 MB',
        } as TestDuration);

        expect(output).toContain('Time: 00:00.123, Memory: 10.00 MB');
    });

    it('testResultSummary uses format template', () => {
        const output = printer.testResultSummary({
            text: 'OK (5 tests, 10 assertions)',
        } as TestResultSummary);

        expect(output).toContain('OK (5 tests, 10 assertions)');
    });

    it('testStarted returns undefined when format is false', () => {
        const noStartPrinter = new Printer(
            phpUnitXML,
            resolveFormat('collision', { colors: false, started: false }),
        );
        noStartPrinter.start();

        const output = noStartPrinter.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_something',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_something',
            file: '',
        } as TestStarted);

        expect(output).toBeUndefined();
        noStartPrinter.close();
    });
});

describe('Printer uses icons from format config', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const format = resolveFormat('collision', {
        colors: false,
        version: '{icon} {text}',
        runtime: '{text}',
        configuration: '{text}',
        processes: '{text}',
        icons: {
            version: ['V', 'VER'],
            passed: ['P', 'OK'],
            failed: ['X', 'FAIL'],
            ignored: ['S', 'SKIP'],
        },
    });
    const printer = new Printer(phpUnitXML, format);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('testVersion uses custom icon', () => {
        const output = printer.testVersion({
            event: TeamcityEvent.testVersion,
            text: 'PHPUnit 11.0',
        } as TestVersion);

        expect(output).toEqual(`V PHPUnit 11.0${EOL}`);
    });

    it('testRuntime uses text only (no icon)', () => {
        const output = printer.testRuntime({ text: 'PHP 8.3' } as TestRuntime);

        expect(output).toEqual(`PHP 8.3${EOL}`);
    });

    it('testConfiguration uses text only (no icon)', () => {
        const output = printer.testConfiguration({
            text: 'phpunit.xml',
        } as TestConfiguration);

        expect(output).toEqual(`phpunit.xml${EOL}${EOL}`);
    });

    it('testProcesses uses text only (no icon)', () => {
        const output = printer.testProcesses({ text: '4' } as TestProcesses);

        expect(output).toEqual(`4${EOL}`);
    });

    it('testFinished uses custom passed icon', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_passed',
            file: '',
            duration: 5,
        });

        expect(output).toEqual(`  P passed 5 ms${EOL}`);
    });

    it('testFailed uses custom failed icon and label in error', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Foo::test_failed',
            file: '',
            message: 'fail',
            details: [],
            duration: 3,
        });

        const endOutput = printer.end();
        expect(endOutput).toContain('X');
        expect(endOutput).toContain('FAIL');
        expect(endOutput).toContain('Foo > failed');
    });

    it('testIgnored uses custom ignored icon', () => {
        const output = printer.testIgnored({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_skipped',
            file: '',
            message: 'reason',
            details: [],
            duration: 0,
        });

        expect(output).toEqual(`  S skipped ➜ reason 0 ms${EOL}`);
    });
});

describe('resolveFormat', () => {
    it('returns base preset without overrides', () => {
        expect(resolveFormat('progress')).toEqual(PRESET_PROGRESS);
        expect(resolveFormat('collision')).toEqual(PRESET_COLLISION);
        expect(resolveFormat('pretty')).toEqual(PRESET_PRETTY);
    });

    it('merges overrides', () => {
        const format = resolveFormat('collision', { finished: '{status_dot}' });
        expect(format.finished).toEqual('{status_dot}');
        expect(format.suiteStarted).toEqual(PRESET_COLLISION.suiteStarted);
    });

    it('deep merges icons overrides', () => {
        const format = resolveFormat('collision', {
            colors: false,
            icons: { passed: ['P', 'OK'] },
        } as Partial<PrinterFormat>);
        expect(format.icons.passed).toEqual(['P', 'OK']);
        expect(format.icons.failed).toEqual(PRESET_COLLISION.icons.failed);
    });

    it('deep merges error overrides', () => {
        const format = resolveFormat('collision', {
            colors: false,
            error: { diff: { header: '--- Exp\n+++ Act' } },
        } as Partial<PrinterFormat>);
        expect(format.error.diff.header).toEqual('--- Exp\n+++ Act');
        expect(format.error.template).toEqual(PRESET_COLLISION.error.template);
        expect(format.error.detail.line).toEqual(PRESET_COLLISION.error.detail.line);
    });
});

describe('Printer exposes all type fields as template variables', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));

    it('testVersion exposes phpunit and paratest variables', () => {
        const format = resolveFormat('collision', {
            colors: false,
            version: '{phpunit} ({paratest})',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testVersion({
            event: TeamcityEvent.testVersion,
            text: 'PHPUnit 11.0 by Sebastian Bergmann and contributors.',
            phpunit: '11.0',
            paratest: '7.0',
        } as TestVersion);

        expect(output).toEqual(`11.0 (7.0)${EOL}`);
    });

    it('testVersion omits empty paratest', () => {
        const format = resolveFormat('collision', {
            colors: false,
            version: '{phpunit} {paratest}',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testVersion({
            event: TeamcityEvent.testVersion,
            text: 'PHPUnit 11.0',
            phpunit: '11.0',
        } as TestVersion);

        expect(output).toEqual(`11.0 ${EOL}`);
    });

    it('testRuntime exposes runtime variable', () => {
        const format = resolveFormat('collision', { colors: false, runtime: 'PHP {runtime}' });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testRuntime({
            text: 'Runtime: PHP 8.3.1',
            runtime: '8.3.1',
        } as TestRuntime);

        expect(output).toEqual(`PHP 8.3.1${EOL}`);
    });

    it('testConfiguration exposes configuration variable', () => {
        const format = resolveFormat('collision', {
            colors: false,
            configuration: 'Config: {configuration}',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testConfiguration({
            text: 'Configuration: /app/phpunit.xml',
            configuration: '/app/phpunit.xml',
        } as TestConfiguration);

        expect(output).toEqual(`Config: /app/phpunit.xml${EOL}${EOL}`);
    });

    it('testProcesses exposes processes variable', () => {
        const format = resolveFormat('collision', {
            colors: false,
            processes: 'Workers: {processes}',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testProcesses({
            text: 'Processes: 4',
            processes: '4',
        } as TestProcesses);

        expect(output).toEqual(`Workers: 4${EOL}`);
    });

    it('suiteStarted exposes name variable', () => {
        const format = resolveFormat('collision', { colors: false, suiteStarted: '{name} ({id})' });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'AssertionsTest',
            flowId: 1,
            id: 'App\\Tests\\AssertionsTest',
        } as TestSuiteStarted);

        expect(output).toEqual(`AssertionsTest (App\\Tests\\AssertionsTest)${EOL}`);
    });

    it('timeAndMemory exposes time and memory variables', () => {
        const format = resolveFormat('collision', {
            colors: false,
            duration: 'T={time} M={memory}',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.timeAndMemory({
            text: 'Time: 00:00.123, Memory: 10.00 MB',
            time: '00:00.123',
            memory: '10.00 MB',
        } as unknown as TestDuration);

        expect(output).toEqual(`T=00:00.123 M=10.00 MB${EOL}`);
    });

    it('testResultSummary exposes tests, assertions, failures etc.', () => {
        const format = resolveFormat('collision', {
            colors: false,
            resultSummary: '{tests} tests, {assertions} assertions, {failures} failures',
        });
        const printer = new Printer(phpUnitXML, format);
        printer.start();

        const output = printer.testResultSummary({
            text: 'OK (5 tests, 10 assertions)',
            tests: 5,
            assertions: 10,
            failures: 0,
        } as unknown as TestResultSummary);

        expect(output).toEqual(`5 tests, 10 assertions, 0 failures${EOL}`);
    });
});

describe('Printer format false hides output', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const format = resolveFormat('collision', {
        colors: false,
        version: false,
        runtime: false,
        configuration: false,
        processes: false,
    });
    const printer = new Printer(phpUnitXML, format);

    it('testVersion returns undefined when format is false', () => {
        expect(
            printer.testVersion({
                event: TeamcityEvent.testVersion,
                text: 'PHPUnit 11.0',
            } as TestVersion),
        ).toBeUndefined();
    });

    it('testRuntime returns undefined when format is false', () => {
        expect(printer.testRuntime({ text: 'Runtime: PHP 8.3' } as TestRuntime)).toBeUndefined();
    });

    it('testConfiguration returns undefined when format is false', () => {
        expect(
            printer.testConfiguration({ text: 'Configuration: phpunit.xml' } as TestConfiguration),
        ).toBeUndefined();
    });

    it('testProcesses returns undefined when format is false', () => {
        expect(printer.testProcesses({ text: 'Processes: 4' } as TestProcesses)).toBeUndefined();
    });
});

describe('Printer error edge cases', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const file = phpUnitProject('tests/AssertionsTest.php');
    let printer: Printer;

    beforeEach(() => {
        printer = new Printer(phpUnitXML, { ...PRESET_COLLISION, colors: false });
        printer.start();
    });

    afterEach(() => printer.close());

    it('testFailed should show source snippet from result.file, not first detail', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            file,
            message: 'Failed asserting that false is true.',
            details: [
                { file: 'vendor/framework/Assert.php', line: 100 },
                { file, line: 27 },
            ],
            duration: 0,
        });

        expect(printer.end()).toContain(' ➜ 27 ▕         $this->assertTrue(false);');
    });

    it('testFailed and file not found omits snippet', () => {
        const notFoundFile = phpUnitProject('tests/NotFoundTest.php');

        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\NotFoundTest::test_failed',
            file: notFoundFile,
            message: 'Failed asserting that false is true.',
            details: [{ file: notFoundFile, line: 22 }],
            duration: 0,
        });

        const output = printer.end() ?? '';
        expect(output).not.toContain('➜');
        expect(output).toContain(`1   ${fileFormat(notFoundFile, 22)}`);
    });

    it('testFailed with Pest-style ID without :: should not crash', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'it can add numbers',
            locationHint: 'file://tests/Unit/ExampleTest.php',
            flowId: 2369,
            id: 'tests/Unit/ExampleTest.php',
            file: 'tests/Unit/ExampleTest.php',
            message: 'Failed asserting that 3 is 4.',
            details: [],
            duration: 0,
        });

        expect(() => printer.end()).not.toThrow();
    });

    it('testFailed with simple scalar diff', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_simple_diff',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_simple_diff',
            file,
            message: 'Failed asserting that false is true.',
            details: [],
            duration: 0,
            type: 'comparisonFailure',
            actual: 'false',
            expected: 'true',
        });

        const output = printer.end();
        expect(output).toContain('- true');
        expect(output).toContain('+ false');
        expect(output).not.toContain('Array');
    });

    it('end clears errors after output', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            file: '',
            message: 'fail',
            details: [],
            duration: 0,
        });

        printer.end();
        expect(printer.end()).toBeUndefined();
    });
});

describe('Printer error grouping', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    let printer: Printer;

    beforeEach(() => {
        const format = resolveFormat('progress', {
            colors: false,
            error: {
                groups: {
                    separator: '--',
                    categories: [
                        {
                            type: 'error',
                            singular: 'There was {count} error:',
                            plural: 'There were {count} errors:',
                        },
                        {
                            type: 'failure',
                            singular: 'There was {count} failure:',
                            plural: 'There were {count} failures:',
                        },
                        {
                            type: 'risky',
                            singular: 'There was {count} risky test:',
                            plural: 'There were {count} risky tests:',
                        },
                    ],
                },
            },
        } as Partial<PrinterFormat>);
        printer = new Printer(phpUnitXML, format);
        printer.start();
    });

    afterEach(() => printer.close());

    it('groups errors and failures with headers and separator', () => {
        // error (exception)
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_throw',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_throw',
            file: '',
            message: 'Exception: something went wrong',
            details: [],
            duration: 0,
        });
        // failure (assertion)
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_fail',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_fail',
            file: '',
            message: 'Failed asserting that false is true.',
            details: [],
            duration: 0,
        });

        const output = printer.end() ?? '';
        expect(output).toContain('There was 1 error:');
        expect(output).toContain('1) App\\Test::test_throw');
        expect(output).toContain('--');
        expect(output).toContain('There was 1 failure:');
        expect(output).toContain('1) App\\Test::test_fail');
    });

    it('uses plural header when count > 1', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_fail1',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_fail1',
            file: '',
            message: 'Failed asserting that 1 is 2.',
            details: [],
            duration: 0,
        });
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_fail2',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_fail2',
            file: '',
            message: 'Failed asserting that 3 is 4.',
            details: [],
            duration: 0,
        });

        const output = printer.end() ?? '';
        expect(output).toContain('There were 2 failures:');
    });

    it('classifies risky tests', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_risky',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_risky',
            file: '',
            message: 'This test did not perform any assertions',
            details: [],
            duration: 0,
        });

        const output = printer.end() ?? '';
        expect(output).toContain('There was 1 risky test:');
        expect(output).toContain('1) App\\Test::test_risky');
    });

    it('omits empty groups', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_fail',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_fail',
            file: '',
            message: 'Failed asserting that false is true.',
            details: [],
            duration: 0,
        });

        const output = printer.end() ?? '';
        expect(output).not.toContain('error:');
        expect(output).not.toContain('risky');
        expect(output).toContain('There was 1 failure:');
    });

    it('resets index per group', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_err',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_err',
            file: '',
            message: 'Exception: boom',
            details: [],
            duration: 0,
        });
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_fail',
            locationHint: '',
            flowId: 1,
            id: 'App\\Test::test_fail',
            file: '',
            message: 'Failed asserting that false is true.',
            details: [],
            duration: 0,
        });

        const output = printer.end() ?? '';
        // error group: 1) App\Test::test_err
        // failure group: 1) App\Test::test_fail  (index resets)
        const matches = output.match(/1\) App\\Test::/g);
        expect(matches).toHaveLength(2);
    });
});

describe('Printer start and error with command', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    let printer: Printer;

    beforeEach(() => {
        printer = new Printer(phpUnitXML, { ...PRESET_COLLISION, colors: false });
    });

    afterEach(() => printer.close());

    it('start returns command with EOL', () => {
        const output = printer.start('php artisan test');

        expect(output).toEqual(`php artisan test${EOL}`);
    });

    it('error includes stored command and error message', () => {
        printer.start('php artisan test');

        const output = printer.error('file not found');

        expect(output).toContain('php artisan test');
        expect(output).toContain('❌ file not found');
    });
});

describe('Printer suite filtering', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    let printer: Printer;

    beforeEach(() => {
        printer = new Printer(phpUnitXML, { ...PRESET_COLLISION, colors: false });
        printer.start('command');
    });

    afterEach(() => printer.close());

    it('testSuiteStarted returns undefined when id contains ::', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'test_passed',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_passed',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when id is empty', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: '',
            flowId: 1,
            id: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns value for class-level id', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'App\\Tests\\FooTest',
            flowId: 1,
            id: 'App\\Tests\\FooTest',
        } as TestSuiteStarted);

        expect(output).toEqual(` PASS  App\\Tests\\FooTest${EOL}`);
    });

    it('testSuiteFinished returns undefined when id contains ::', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: 'test_passed',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_passed',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });

    it('testSuiteFinished returns undefined when id is empty', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: '',
            flowId: 1,
            id: '',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when no file (config path)', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: '/path/to/phpunit.xml',
            flowId: 1,
            id: '/path/to/phpunit.xml',
            file: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteStarted returns undefined when no file (testsuite name)', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'Unit',
            flowId: 1,
            id: 'Unit',
            file: '',
        } as TestSuiteStarted);

        expect(output).toBeUndefined();
    });

    it('testSuiteFinished returns undefined when no file (testsuite name)', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: 'Unit',
            flowId: 1,
            id: 'Unit',
            file: '',
        } as TestSuiteFinished);

        expect(output).toBeUndefined();
    });
});

describe('Printer inline error display', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const file = phpUnitProject('tests/AssertionsTest.php');
    let printer: Printer;

    beforeEach(() => {
        const format = resolveFormat('collision', {
            colors: false,
            error: { display: 'inline' },
        } as Partial<PrinterFormat>);
        printer = new Printer(phpUnitXML, format);
        printer.start('command');
    });

    afterEach(() => printer.close());

    it('testFinished includes error details inline for failed test', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_failed',
            file,
            message: 'Failed asserting that false is true.',
            details: [{ file, line: 27 }],
            duration: 5,
        });

        expect(output).toContain('failed');
        expect(output).toContain('Failed asserting that false is true.');
    });

    it('testFinished returns normal output for passed test', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_passed',
            file: '',
            duration: 5,
        });

        expect(output).toContain('passed');
        expect(output).not.toContain('Failed');
    });

    it('end returns undefined in inline mode', () => {
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 1,
            id: 'App\\Tests\\FooTest::test_failed',
            file: '',
            message: 'fail',
            details: [],
            duration: 0,
        });

        expect(printer.end()).toBeUndefined();
    });
});
