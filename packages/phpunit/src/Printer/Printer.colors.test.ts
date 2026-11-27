import styles from 'ansi-styles';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/support/fixtures';
import { PHPUnitXML } from '../PHPUnitXML/PHPUnitXML';
import { TeamcityEvent, type TestResultSummary } from '../TestOutput/types';
import { Printer } from './Printer';
import { PRESET_PROGRESS, resolveFormat } from './PrinterConfig';

describe('Printer PRESET_PROGRESS dot colors', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const file = phpUnitProject('tests/AssertionsTest.php');
    const printer = new Printer(phpUnitXML, PRESET_PROGRESS);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('failed dot F uses bgRed + white', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_failed',
            file,
            message: 'Failed asserting that false is true.',
            details: [{ file, line: 27 }],
            duration: 0,
        });

        expect(output).toContain('\x1b[41m');
        expect(output).toContain('\x1b[37m');
        expect(output).toContain('F');
    });

    it('ignored dot S uses cyan + bold', () => {
        const output = printer.testIgnored({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_skipped',
            file,
            message: 'Skipped.',
            details: [],
            duration: 0,
        });

        expect(output).toContain('\x1b[36m');
        expect(output).toContain('\x1b[1m');
        expect(output).toContain('S');
    });

    it('error dot E uses red + bold (not bgRed)', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_error',
            locationHint: '',
            flowId: 1,
            id: 'Foo::test_error',
            file,
            message: 'RuntimeException: something broke',
            details: [{ file, line: 10 }],
            duration: 0,
        });

        expect(output).toContain('\x1b[31m');
        expect(output).toContain('\x1b[1m');
        expect(output).toContain('E');
    });
});

describe('Printer testResultSummary colorizes each status segment', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));

    it('colors passed count green when all tests pass', () => {
        const printer = new Printer(phpUnitXML, resolveFormat('collision'));
        printer.start();

        const output = printer.testResultSummary({
            text: '  Tests:    78 passed (85 assertions)',
            passed: 78,
            assertions: 85,
        } as unknown as TestResultSummary);

        expect(output).toContain(`${styles.green.open}78 passed${styles.green.close}`);
        expect(output).toContain('(85 assertions)');
    });

    it('colors failed red, skipped yellow, passed green separately', () => {
        const printer = new Printer(phpUnitXML, resolveFormat('collision'));
        printer.start();

        const output = printer.testResultSummary({
            text: '  Tests:    1 failed, 2 skipped, 78 passed (85 assertions)',
            failed: 1,
            skipped: 2,
            passed: 78,
            assertions: 85,
        } as unknown as TestResultSummary);

        expect(output).toContain(`${styles.red.open}1 failed${styles.red.close}`);
        expect(output).toContain(`${styles.yellow.open}2 skipped${styles.yellow.close}`);
        expect(output).toContain(`${styles.green.open}78 passed${styles.green.close}`);
        expect(output).toContain('(85 assertions)');
    });
});
