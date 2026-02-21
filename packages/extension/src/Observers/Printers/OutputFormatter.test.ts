import {
    EOL,
    PHPUnitXML,
    phpUnitProject,
    TeamcityEvent,
    type TestFinished,
    type TestSuiteFinished,
} from '@vscode-phpunit/phpunit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OutputFormatter } from './OutputFormatter';

class MyOutputFormatter extends OutputFormatter {
    testFinished(_result: TestFinished): string | undefined {
        return undefined;
    }
}

describe('OutputFormatter', () => {
    const phpUnitXML = new PHPUnitXML();
    const printer = new MyOutputFormatter(phpUnitXML);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('testVersion', () => {
        const output = printer.testVersion({
            event: TeamcityEvent.testVersion,
            phpunit: '11.5.0',
            paratest: undefined,
            text: 'PHPUnit 11.5.0 by Sebastian Bergmann and contributors.',
        });

        expect(output).toEqual(
            `${EOL}🚀 PHPUnit 11.5.0 by Sebastian Bergmann and contributors.${EOL}`,
        );
    });

    it('testRuntime', () => {
        const output = printer.testRuntime({
            event: TeamcityEvent.testRuntime,
            runtime: 'PHP 8.3.14',
            text: 'Runtime:       PHP 8.3.14',
        });

        expect(output).toEqual('Runtime:       PHP 8.3.14');
    });

    it('testConfiguration', () => {
        const output = printer.testConfiguration({
            event: TeamcityEvent.testConfiguration,
            configuration: phpUnitProject('phpunit.xml'),
            text: `Configuration: ${phpUnitProject('phpunit.xml')}`,
        });

        expect(output).toEqual(`Configuration: ${phpUnitProject('phpunit.xml')}${EOL}`);
    });

    it('testResultSummary', () => {
        const output = printer.testResultSummary({
            event: TeamcityEvent.testResultSummary,
            text: 'Tests: 33, Assertions: 30, Errors: 2, Failures: 6, Warnings: 1, PHPUnit Deprecations: 8, Skipped: 1, Incomplete: 1, Risky: 2.',
            tests: 33,
            assertions: 30,
            errors: 2,
            failures: 6,
            warnings: 1,
            phpunitDeprecations: 8,
            skipped: 1,
            incomplete: 1,
            risky: 2,
        });

        expect(output).toEqual(
            'Tests: 33, Assertions: 30, Errors: 2, Failures: 6, Warnings: 1, PHPUnit Deprecations: 8, Skipped: 1, Incomplete: 1, Risky: 2.',
        );
    });

    it('timeAndMemory', () => {
        const output = printer.timeAndMemory({
            time: '00:00.055',
            memory: '10.00 MB',
            event: TeamcityEvent.testDuration,
            text: 'Time: 00:00.055, Memory: 10.00 MB',
        });

        expect(output).toEqual('Time: 00:00.055, Memory: 10.00 MB');
    });

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
