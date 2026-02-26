import { describe, expect, it } from 'vitest';
import { phpUnitProject } from '../../tests/utils';
import { PHPUnitXML } from '../Configuration/PHPUnitXML';
import {
    TeamcityEvent,
    type TestConfiguration,
    type TestDuration,
    type TestResultSummary,
    type TestRuntime,
} from '../TestOutput/types';
import { EOL } from '../utils';
import { Printer } from './Printer';
import { PRESET_COLLISION, PRESET_PRETTY, PRESET_PROGRESS } from './PrinterConfig';
import { fileFormat } from './SourceFileReader';

function fileLink(path: string, line: number): string {
    return fileFormat(path, line);
}

function collect(lines: (string | undefined)[]): string {
    return lines.filter((line): line is string => line !== undefined).join('');
}

const file = phpUnitProject('tests/AssertionsTest.php');

function runLifecycle(printer: Printer) {
    printer.start();

    return collect([
        printer.testVersion({
            event: TeamcityEvent.testVersion,
            text: 'PHPUnit 11.0 by Sebastian Bergmann and contributors.',
            phpunit: '11.0',
        }),
        printer.testRuntime({
            text: 'Runtime: PHP 8.3.1',
            runtime: '8.3.1',
        } as unknown as TestRuntime),
        printer.testConfiguration({
            text: 'Configuration: /app/phpunit.xml',
            configuration: '/app/phpunit.xml',
        } as unknown as TestConfiguration),
        printer.testSuiteStarted({
            event: TeamcityEvent.testSuiteStarted,
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            locationHint: `php_qn://${file}::\\Recca0120\\VSCode\\Tests\\AssertionsTest`,
            flowId: 22695,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            file,
        }),
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_passed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            file,
        }),
        printer.testFinished({
            event: TeamcityEvent.testFinished,
            name: 'test_passed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_passed',
            file,
            duration: 5,
        }),
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_is_not_same',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
            file,
        }),
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_is_not_same',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same',
            file,
            message: 'Failed asserting that two arrays are identical.',
            details: [
                { file: 'vendor/phpunit/phpunit/src/Framework/Assert.php', line: 218 },
                { file, line: 32 },
            ],
            duration: 29,
            type: 'comparisonFailure',
            actual: "Array &0 [\n    'e' => 'f',\n    0 => 'g',\n    1 => 'h',\n]",
            expected: "Array &0 [\n    'a' => 'b',\n    'c' => 'd',\n]",
        }),
        printer.testStarted({
            event: TeamcityEvent.testStarted,
            name: 'test_failed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            file,
        }),
        printer.testFinished({
            event: TeamcityEvent.testFailed,
            name: 'test_failed',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed',
            file,
            message: 'Failed asserting that false is true.',
            details: [
                { file: 'vendor/phpunit/phpunit/src/Framework/Assert.php', line: 198 },
                { file, line: 27 },
            ],
            duration: 0,
        }),
        printer.testIgnored({
            event: TeamcityEvent.testIgnored,
            name: 'test_skipped',
            locationHint: '',
            flowId: 2369,
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest::test_skipped',
            file,
            message: 'The MySQLi extension is not available.',
            details: [],
            duration: 0,
        }),
        printer.testSuiteFinished({
            event: TeamcityEvent.testSuiteFinished,
            name: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            id: 'Recca0120\\VSCode\\Tests\\AssertionsTest',
            flowId: 8024,
        }),
        printer.timeAndMemory({
            text: 'Time: 00:00.123, Memory: 10.00 MB',
            time: '00:00.123',
            memory: '10.00 MB',
        } as unknown as TestDuration),
        printer.testResultSummary({
            text: 'FAILURES! (Tests: 4, Assertions: 4, Failures: 2)',
            tests: 4,
            assertions: 4,
            failures: 2,
        } as unknown as TestResultSummary),
    ]);
}

describe('Printer presets', () => {
    const phpUnitXML = new PHPUnitXML().setRoot(phpUnitProject(''));

    it('Progress', () => {
        const printer = new Printer(phpUnitXML, { ...PRESET_PROGRESS, colors: false });
        const output = runLifecycle(printer);

        expect(output).toEqual(
            [
                `🚀 PHPUnit 11.0 by Sebastian Bergmann and contributors.${EOL}`,
                `Runtime: PHP 8.3.1${EOL}`,
                `Configuration: /app/phpunit.xml${EOL}`,
                EOL,
                '.',
                'F',
                'F',
                'S',
                EOL + EOL,
                `There were 2 failures:${EOL}`,
                EOL,
                `1) Recca0120\\VSCode\\Tests\\AssertionsTest::test_is_not_same${EOL}`,
                `Failed asserting that two arrays are identical.${EOL}`,
                `--- Expected${EOL}`,
                `+++ Actual${EOL}`,
                `@@ @@${EOL}`,
                ` Array &0 [${EOL}`,
                `-    'a' => 'b',${EOL}`,
                `-    'c' => 'd',${EOL}`,
                `+    'e' => 'f',${EOL}`,
                `+    0 => 'g',${EOL}`,
                `+    1 => 'h',${EOL}`,
                ` ]${EOL}`,
                EOL,
                EOL,
                fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 218) + EOL,
                fileLink(file, 32) + EOL,
                `2) Recca0120\\VSCode\\Tests\\AssertionsTest::test_failed${EOL}`,
                `Failed asserting that false is true.${EOL}`,
                EOL,
                fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 198) + EOL,
                fileLink(file, 27) + EOL,
                `Time: 00:00.123, Memory: 10.00 MB${EOL}`,
                `FAILURES! (Tests: 4, Assertions: 4, Failures: 2)${EOL}`,
            ].join(''),
        );

        printer.close();
    });

    it('Collision', () => {
        const printer = new Printer(phpUnitXML, { ...PRESET_COLLISION, colors: false });
        const output = runLifecycle(printer);

        expect(output).toEqual(
            [
                `🚀 PHPUnit 11.0 by Sebastian Bergmann and contributors.${EOL}`,
                `Runtime: PHP 8.3.1${EOL}`,
                `Configuration: /app/phpunit.xml${EOL}`,
                EOL,
                ` PASS  Recca0120\\VSCode\\Tests\\AssertionsTest${EOL}`,
                `  ✓ passed 5 ms${EOL}`,
                `  ⨯ is_not_same 29 ms${EOL}`,
                `  ⨯ failed 0 ms${EOL}`,
                `  - skipped ➜ The MySQLi extension is not available. 0 ms${EOL}`,
                EOL,
                `  ${'─'.repeat(76)}${EOL}`,
                `⨯  FAILED   AssertionsTest > is_not_same${EOL}`,
                `Failed asserting that two arrays are identical.${EOL}`,
                ` Array &0 [${EOL}`,
                `-    'a' => 'b',${EOL}`,
                `-    'c' => 'd',${EOL}`,
                `+    'e' => 'f',${EOL}`,
                `+    0 => 'g',${EOL}`,
                `+    1 => 'h',${EOL}`,
                ` ]${EOL}`,
                EOL,
                EOL,
                `at ${fileLink(file, 32)}${EOL}`,
                `   28 ▕     }${EOL}`,
                `   29 ▕ ${EOL}`,
                `   30 ▕     public function test_is_not_same()${EOL}`,
                `   31 ▕     {${EOL}`,
                ` ➜ 32 ▕         $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);${EOL}`,
                `   33 ▕     }${EOL}`,
                `   34 ▕ ${EOL}`,
                `   35 ▕     public function test_risky()${EOL}`,
                `   36 ▕     {${EOL}`,
                EOL,
                `1   ${fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 218)}${EOL}`,
                `2   ${fileLink(file, 32)}${EOL}`,
                EOL,
                `  ${'─'.repeat(76)}${EOL}`,
                `⨯  FAILED   AssertionsTest > failed${EOL}`,
                `Failed asserting that false is true.${EOL}`,
                EOL,
                `at ${fileLink(file, 27)}${EOL}`,
                `   23 ▕      * @depends test_passed${EOL}`,
                `   24 ▕      */${EOL}`,
                `   25 ▕     public function test_failed()${EOL}`,
                `   26 ▕     {${EOL}`,
                ` ➜ 27 ▕         $this->assertTrue(false);${EOL}`,
                `   28 ▕     }${EOL}`,
                `   29 ▕ ${EOL}`,
                `   30 ▕     public function test_is_not_same()${EOL}`,
                `   31 ▕     {${EOL}`,
                EOL,
                `1   ${fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 198)}${EOL}`,
                `2   ${fileLink(file, 27)}${EOL}`,
                EOL,
                `Duration: 00:00.123${EOL}`,
                `Tests:  2 failed, 2 passed (4 assertions)${EOL}`,
            ].join(''),
        );

        printer.close();
    });

    it('Pretty', () => {
        const printer = new Printer(phpUnitXML, { ...PRESET_PRETTY, colors: false });
        const output = runLifecycle(printer);

        expect(output).toEqual(
            [
                `PHPUnit 11.0 by Sebastian Bergmann and contributors.${EOL}`,
                `Runtime: PHP 8.3.1${EOL}`,
                `Configuration: /app/phpunit.xml${EOL}`,
                EOL,
                `Recca0120\\VSCode\\Tests\\AssertionsTest${EOL}`,
                `  passed 5 ms${EOL}`,
                `  is_not_same 29 ms${EOL}`,
                `  failed 0 ms${EOL}`,
                `  skipped ➜ The MySQLi extension is not available. 0 ms${EOL}`,
                EOL,
                `  ${'─'.repeat(76)}${EOL}`,
                ` FAILED   AssertionsTest > is_not_same${EOL}`,
                `Failed asserting that two arrays are identical.${EOL}`,
                ` Array &0 [${EOL}`,
                `-    'a' => 'b',${EOL}`,
                `-    'c' => 'd',${EOL}`,
                `+    'e' => 'f',${EOL}`,
                `+    0 => 'g',${EOL}`,
                `+    1 => 'h',${EOL}`,
                ` ]${EOL}`,
                EOL,
                EOL,
                `at ${fileLink(file, 32)}${EOL}`,
                `   28 ▕     }${EOL}`,
                `   29 ▕ ${EOL}`,
                `   30 ▕     public function test_is_not_same()${EOL}`,
                `   31 ▕     {${EOL}`,
                ` ➜ 32 ▕         $this->assertSame(['a' => 'b', 'c' => 'd'], ['e' => 'f', 'g', 'h']);${EOL}`,
                `   33 ▕     }${EOL}`,
                `   34 ▕ ${EOL}`,
                `   35 ▕     public function test_risky()${EOL}`,
                `   36 ▕     {${EOL}`,
                EOL,
                `1   ${fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 218)}${EOL}`,
                `2   ${fileLink(file, 32)}${EOL}`,
                EOL,
                `  ${'─'.repeat(76)}${EOL}`,
                ` FAILED   AssertionsTest > failed${EOL}`,
                `Failed asserting that false is true.${EOL}`,
                EOL,
                `at ${fileLink(file, 27)}${EOL}`,
                `   23 ▕      * @depends test_passed${EOL}`,
                `   24 ▕      */${EOL}`,
                `   25 ▕     public function test_failed()${EOL}`,
                `   26 ▕     {${EOL}`,
                ` ➜ 27 ▕         $this->assertTrue(false);${EOL}`,
                `   28 ▕     }${EOL}`,
                `   29 ▕ ${EOL}`,
                `   30 ▕     public function test_is_not_same()${EOL}`,
                `   31 ▕     {${EOL}`,
                EOL,
                `1   ${fileLink('vendor/phpunit/phpunit/src/Framework/Assert.php', 198)}${EOL}`,
                `2   ${fileLink(file, 27)}${EOL}`,
                EOL,
                `Duration: 00:00.123${EOL}`,
                `Tests:  2 failed, 2 passed (4 assertions)${EOL}`,
            ].join(''),
        );

        printer.close();
    });
});
