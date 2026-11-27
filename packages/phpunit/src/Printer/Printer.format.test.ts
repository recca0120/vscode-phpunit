import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { EOL } from '../constants';
import { PHPUnitXML } from '../PHPUnitXML/PHPUnitXML';
import {
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestProcesses,
    type TestResultSummary,
    type TestRuntime,
    type TestStarted,
    type TestSuiteStarted,
    type TestVersion,
} from '../TestOutput/types';
import { Printer } from './Printer';
import { resolveFormat } from './PrinterConfig';

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
