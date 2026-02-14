import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EOL, PHPUnitXML, TeamcityEvent } from '../../PHPUnit';
import { phpUnitProject } from '../../PHPUnit/__tests__/utils';
import { CollisionPrinter } from './CollisionPrinter';
import { OutputFormatter } from './OutputFormatter';

describe('CollisionPrinter', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));
    const printer = new CollisionPrinter(phpUnitXML);

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

    it('testSuiteFinished', () => {
        const output = printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            flowId: 8024,
        } as unknown as import('../../PHPUnit').TestSuiteFinished);

        expect(output).toEqual('');
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

        expect(output).toEqual('✅ passed 0 ms');
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
                    line: 27,
                },
            ],
            duration: 0,
        });

        expect(output).toEqual([`❌ failed 0 ms`].join(EOL));

        expect(printer.end()).toEqual(
            [
                ``,
                `❌ FAILED  Recca0120\\VSCode\\Tests\\AssertionsTest > failed`,
                `Failed asserting that false is true.`,
                ``,
                `at ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 27)}`,
                `  23 ▕      * @depends test_passed`,
                `  24 ▕      */`,
                `  25 ▕     public function test_failed()`,
                `  26 ▕     {`,
                `➜ 27 ▕         $this->assertTrue(false);`,
                `  28 ▕     }`,
                `  29 ▕ `,
                `  30 ▕     public function test_is_not_same()`,
                `  31 ▕     {`,
                `  32 ▕         $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);`,
                ``,
                `1. ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 27)}`,
                ``,
            ].join(EOL),
        );
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
                    line: 32,
                },
            ],
            duration: 29,
            type: 'comparisonFailure',
            actual: "Array &0 [\n    'e' => 'f',\n    0 => 'g',\n    1 => 'h',\n]",
            expected: "Array &0 [\n    'a' => 'b',\n    'c' => 'd',\n]",
        });

        expect(output).toEqual([`❌ is_not_same 29 ms`].join(EOL));

        expect(printer.end()).toEqual(
            [
                ``,
                `❌ FAILED  Recca0120\\VSCode\\Tests\\AssertionsTest > is_not_same`,
                `Failed asserting that two arrays are identical.`,
                ` Array &0 [`,
                `-    'a' => 'b',`,
                `-    'c' => 'd',`,
                `+    'e' => 'f',`,
                `+    0 => 'g',`,
                `+    1 => 'h',`,
                ` ]`,
                ``,
                ``,
                `at ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 32)}`,
                `  28 ▕     }`,
                `  29 ▕ `,
                `  30 ▕     public function test_is_not_same()`,
                `  31 ▕     {`,
                `➜ 32 ▕         $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);`,
                `  33 ▕     }`,
                `  34 ▕ `,
                `  35 ▕     public function test_risky()`,
                `  36 ▕     {`,
                `  37 ▕         $a = 1;`,
                ``,
                `1. ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 32)}`,
                ``,
            ].join(EOL),
        );
    });

    it('testFailed and file not found', () => {
        const output = printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: `php_qn://${phpUnitProject('tests/NotFoundTest.php')}::\\Recca0120\\VSCode\\Tests\\NotFoundTest::test_failed`,
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\NotFoundTest::test_failed',
            file: phpUnitProject('tests/NotFoundTest.php'),
            message: 'Failed asserting that false is true.',
            details: [
                {
                    file: phpUnitProject('tests/NotFoundTest.php'),
                    line: 22,
                },
            ],
            duration: 0,
        });

        expect(output).toEqual([`❌ failed 0 ms`].join(EOL));

        expect(printer.end()).toEqual(
            [
                ``,
                `❌ FAILED  Recca0120\\VSCode\\Tests\\NotFoundTest > failed`,
                `Failed asserting that false is true.`,
                ``,
                `1. ${OutputFormatter.fileFormat(phpUnitProject('tests/NotFoundTest.php'), 22)}`,
                ``,
            ].join(EOL),
        );
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

        expect(output).toEqual(
            [`➖ skipped ➜ The MySQLi extension is not available. 0 ms`].join(EOL),
        );
    });
});
