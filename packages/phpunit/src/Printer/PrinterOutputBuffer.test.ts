import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { PHPUnitXML } from '../Configuration/PHPUnitXML';
import { TeamcityEvent, type TestSuiteFinished } from '../TestOutput/types';
import { Printer } from './Printer';
import { PRESET_PROGRESS } from './PrinterConfig';

describe('Printer output buffer', () => {
    const phpUnitXML = new PHPUnitXML();
    const printer = new Printer(phpUnitXML, PRESET_PROGRESS);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('should print printed output', async () => {
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_die',
            locationHint: `php_qn://${phpUnitProject('tests/Output/OutputTest.php')}::\\Recca0120\\VSCode\\Tests\\Output\\OutputTest::test_echo`,
            flowId: 97825,
            id: 'Recca0120\\VSCode\\Tests\\Output\\OutputTest::test_echo',
            file: phpUnitProject('tests/Output/OutputTest.php'),
        });
        printer.append('printed output');

        const output = printer.printedOutput();

        expect(output).toEqual('🟨 printed output');
    });

    it('should print printed output when die', () => {
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_die',
            locationHint: `php_qn://${phpUnitProject('tests/Output/OutputTest.php')}::\\Recca0120\\VSCode\\Tests\\Output\\OutputTest::test_die`,
            flowId: 97825,
            id: 'Recca0120\\VSCode\\Tests\\Output\\OutputTest::test_die',
            file: phpUnitProject('tests/Output/OutputTest.php'),
        });
        printer.append('printed output when die');

        const output = printer.printedOutput();

        expect(output).toEqual('🟨 printed output when die');
    });

    it('should print dump output', () => {
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_dump',
            locationHint: `php_qn://${phpUnitProject('tests/Output/OutputTest.php')}::\\Tests\\Output\\OutputTest::test_dump`,
            flowId: 97825,
            id: 'Tests\\Output\\OutputTest::test_dump',
            file: phpUnitProject('tests/Output/OutputTest.php'),
        });
        printer.append('array:7 [\n  "name" => "PHPUnit"\n  "version" => 12\n]');

        const output = printer.printedOutput();

        expect(output).toEqual('🟨 array:7 [\n  "name" => "PHPUnit"\n  "version" => 12\n]');
    });

    it('should strip ANSI codes from dump output', () => {
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_dump',
            locationHint: `php_qn://${phpUnitProject('tests/Output/OutputTest.php')}::\\Tests\\Output\\OutputTest::test_dump`,
            flowId: 97825,
            id: 'Tests\\Output\\OutputTest::test_dump',
            file: phpUnitProject('tests/Output/OutputTest.php'),
        });
        // Real ANSI output from dd(['test' => 'foo']) in issue #322
        printer.append(
            '\u001B[0;38;5;208m\u001B[38;5;38marray:1\u001B[0;38;5;208m [\u001B[m\n' +
                '  \u001B[0;38;5;208m"\u001B[38;5;113mtest\u001B[0;38;5;208m" => "\u001B[1;38;5;113mfoo\u001B[0;38;5;208m"\u001B[m\n' +
                '\u001B[0;38;5;208m]\u001B[m',
        );

        const output = printer.printedOutput();

        expect(output).toEqual('🟨 array:1 [\n  "test" => "foo"\n]');
    });

    it('testSuiteFinished', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            flowId: 8024,
        } as unknown as TestSuiteFinished);

        expect(output).toBeUndefined();
    });
});
