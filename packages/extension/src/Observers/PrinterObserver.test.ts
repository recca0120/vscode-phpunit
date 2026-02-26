import {
    Configuration,
    type Path,
    PathReplacer,
    PHPUnitXML,
    PRESET_PROGRESS,
    Printer,
    ProcessBuilder,
    semverLt,
    TestRunner,
} from '@vscode-phpunit/phpunit';
import { detectPhpUnitStubs, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import type { OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import { PrinterObserver } from './PrinterObserver';
import { OutputChannelWriter } from './Writers';

describe.each(detectPhpUnitStubs())('PrinterObserver on $name (PHPUnit $phpUnitVersion)', ({
    root,
    phpUnitVersion,
    binary,
    args: stubArgs,
}) => {
    let testRunner: TestRunner;
    let outputChannel: OutputChannel;
    let configuration: Configuration;

    beforeEach(() => {
        configuration = new Configuration({
            php: 'php',
            phpunit: binary,
            args: ['-c', 'phpunit.xml', ...stubArgs],
        });
        testRunner = new TestRunner();
        outputChannel = vscode.window.createOutputChannel('phpunit');
        const observer = new PrinterObserver(
            new OutputChannelWriter(outputChannel),
            new Printer(new PHPUnitXML(), PRESET_PROGRESS),
        );
        testRunner.observe(observer);
    });

    function getOutputChannel(): OutputChannel {
        return (vscode.window.createOutputChannel as Mock).mock.results[0].value;
    }

    async function run(file?: string, filter?: string) {
        if (filter) {
            filter = `--filter='^.*::(${filter})( with data set .*)?$'`;
        }

        const cwd = root;
        const options = { cwd };
        const builder = new ProcessBuilder(
            configuration,
            options,
            new PathReplacer(options, configuration.get('paths') as Path),
        );
        builder.setArguments([file, filter].join(' '));

        await testRunner.run(builder).run();
    }

    it('should trigger input', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);
        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(
                new RegExp(
                    `php .+phpunit .+${testFile.replace(/[/\\]/g, '.')} --colors=always --teamcity`,
                ),
            ),
        );
    });

    it('should trigger testVersion', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(expect.stringMatching(/PHPUnit\s[\d.]+/));
    });

    it('should trigger testRuntime', async () => {
        if (semverLt(phpUnitVersion, '10.0.0')) {
            return;
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(/Runtime:\s+PHP\s[\d.]+/),
        );
    });

    it('should trigger testConfiguration', async () => {
        if (semverLt(phpUnitVersion, '10.0.0')) {
            return;
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(/Configuration:.+/),
        );
    });

    it('should trigger testSuiteStarted', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::test_passed',
        );
    });

    it('should trigger testSuiteStarted without method', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'addition_provider|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::addition_provider',
        );
    });

    it('should trigger testFinished', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith('.');
    });

    it('should trigger testFailed', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith('F');
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringContaining('Failed asserting that false is true.'),
        );
    });

    it('should trigger testFailed with actual and expect', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_is_not_same';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith('F');
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringContaining('Failed asserting that two arrays are identical.'),
        );
        expect(outputChannel.append).toHaveBeenCalledWith(expect.stringContaining('--- Expected'));
    });

    it('should trigger testIgnored', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_skipped';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith('S');
    });

    it('should trigger testResultSummary', async () => {
        if (semverLt(phpUnitVersion, '10.0.0')) {
            return;
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(/Tests: \d+, Assertions: \d+/),
        );
    });

    it('should trigger testDuration', async () => {
        if (semverLt(phpUnitVersion, '10.0.0')) {
            return;
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(/Time: [\d:.]+(\s\w+)?, Memory: [\d.]+\s\w+/),
        );
    });

    it('should trigger error', async () => {
        const testFile = phpUnitProject('tests/NotFound.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(expect.stringMatching('❌'));
        expect(outputChannel.append).toHaveBeenCalledWith(expect.stringMatching(/NotFound\.php/));
    });

    it('should print printed output', async () => {
        const testFile = phpUnitProject('tests/Output/OutputTest.php');
        const filter = 'test_echo';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringContaining('printed output'),
        );
    });
});
