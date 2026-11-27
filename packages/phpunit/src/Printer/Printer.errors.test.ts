import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../test-support/fixtures';
import { EOL } from '../constants';
import { PHPUnitXML } from '../PHPUnitXML/PHPUnitXML';
import { TeamcityEvent } from '../TestOutput/types';
import { Printer } from './Printer';
import { PRESET_COLLISION, resolveFormat } from './PrinterConfig';
import type { PrinterFormat } from './PrinterFormat';
import { fileFormat } from './SourceFileReader';

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
        const matches = output.match(/1\) App\\Test::/g);
        expect(matches).toHaveLength(2);
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
