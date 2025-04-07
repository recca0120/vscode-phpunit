import { EOL, PHPUnitXML, TeamcityEvent } from '../../PHPUnit';
import { phpUnitProject } from '../../PHPUnit/__tests__/utils';
import { PrettyPrinter } from './PrettyPrinter';
import { Printer } from './Printer';

describe('PrettyPrinter', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const printer = new PrettyPrinter(phpUnitXML);

    beforeEach(() => printer.start());
    afterEach(() => printer.close());

    it('testSuiteStarted', () => {
        const output = printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
            flowId: 22695,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            file: phpUnitProject('tests/AssertionsTest.php'),
        });

        expect(output).toEqual('Recca0120\\VSCode\\Tests\\AssertionsTest');
    });

    it('testStarted', () => {
        const output = printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_is_not_same',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
            file: phpUnitProject('tests/AssertionsTest.php'),
        });

        expect(output).toBeUndefined();
    });

    it('testFinished', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            file: phpUnitProject('tests/AssertionsTest.php'),
            duration: 0,
        });

        expect(output).toEqual('  ✅ passed 0 ms');
    });

    it('testFailed', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            file: phpUnitProject('tests/AssertionsTest.php'),
            message: 'Failed asserting that false is true.',
            details: [
                {
                    file: phpUnitProject('tests/AssertionsTest.php'),
                    line: 22,
                },
            ],
            duration: 0,
        });

        expect(output).toEqual([
            `  ❌ failed 0 ms`,
            `     ┐ `,
            `     ├ Failed asserting that false is true.`,
            `     │ `,
            `     │ ${Printer.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 22)}`,
            `     ┴ `,
            ``,
        ].join(EOL));
    });

    it('testFailed with actual and expect', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_is_not_same',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
            file: phpUnitProject('tests/AssertionsTest.php'),
            message: 'Failed asserting that two arrays are identical.',
            details: [
                {
                    file: phpUnitProject('tests/AssertionsTest.php'),
                    line: 27,
                },
            ],
            duration: 29,
            type: 'comparisonFailure',
            actual: 'Array &0 [\n    \'e\' => \'f\',\n    0 => \'g\',\n    1 => \'h\',\n]',
            expected: 'Array &0 [\n    \'a\' => \'b\',\n    \'c\' => \'d\',\n]',
        });

        expect(output).toEqual([
            `  ❌ is_not_same 29 ms`,
            `     ┐ `,
            `     ├ Failed asserting that two arrays are identical.`,
            `     ┊ ---·Expected Array &0 [`,
            `     ┊     'a' => 'b',`,
            `     ┊     'c' => 'd',`,
            `     ┊ ]`,
            `     ┊ +++·Actual Array &0 [`,
            `     ┊     'e' => 'f',`,
            `     ┊     0 => 'g',`,
            `     ┊     1 => 'h',`,
            `     ┊ ]`,
            `     │ `,
            `     │ ${Printer.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 27)}`,
            `     ┴ `,
            ``,
        ].join(EOL));
    });

    it('testIgnored', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            locationHint: `php_qn://${phpUnitProject('tests/AssertionsTest.php')}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::test_skipped`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_skipped',
            file: phpUnitProject('tests/AssertionsTest.php'),
            message: 'The MySQLi extension is not available.',
            duration: 0,
        });

        expect(output).toEqual([`  ➖ skipped 0 ms`].join(EOL));
    });
});