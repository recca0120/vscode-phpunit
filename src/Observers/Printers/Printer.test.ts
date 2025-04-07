import { EOL, PHPUnitXML, TeamcityEvent, TestFinished } from '../../PHPUnit';
import { phpUnitProject } from '../../PHPUnit/__tests__/utils';
import { Printer } from './Printer';

class MyPrinter extends Printer {
    testFinished(_result: TestFinished): string | undefined {
        return undefined;
    }
}

describe('Printer', () => {
    const phpUnitXML = new PHPUnitXML();
    const printer = new MyPrinter(phpUnitXML);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('testVersion', () => {
        const output = printer.testVersion({
            event: TeamcityEvent.testVersion,
            phpunit: '11.5.0',
            paratest: undefined,
            text: 'PHPUnit 11.5.0 by Sebastian Bergmann and contributors.',
        });

        expect(output).toEqual(`${EOL}🚀 PHPUnit 11.5.0 by Sebastian Bergmann and contributors.${EOL}`);
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

        expect(output).toEqual('Tests: 33, Assertions: 30, Errors: 2, Failures: 6, Warnings: 1, PHPUnit Deprecations: 8, Skipped: 1, Incomplete: 1, Risky: 2.');
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

    it('testSuiteFinished', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            flowId: 8024,
        } as any);

        expect(output).toBeUndefined();
    });
});