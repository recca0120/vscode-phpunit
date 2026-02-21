import {
    Configuration,
    detectPhpUnitStubs,
    EOL,
    type Path,
    PathReplacer,
    PHPUnitXML,
    ProcessBuilder,
    phpUnitProject,
    semverGte,
    semverLt,
    TestRunner,
} from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import type { OutputChannel, TestRunRequest } from 'vscode';
import * as vscode from 'vscode';
import { OutputChannelObserver, OutputFormatter } from './index';
import { PrettyPrinter } from './Printers';

describe('OutputChannelObserver clear behavior', () => {
    const createObserver = (
        config: Record<string, unknown> = {},
        request: TestRunRequest = { continuous: false } as TestRunRequest,
    ) => {
        const outputChannel = vscode.window.createOutputChannel('phpunit');
        const configuration = new Configuration({
            clearOutputOnRun: true,
            showAfterExecution: 'onFailure',
            ...config,
        });
        const observer = new OutputChannelObserver(
            outputChannel,
            configuration,
            new PrettyPrinter(new PHPUnitXML()),
            request,
        );

        return { observer, outputChannel };
    };

    const createBuilder = (command: string) => {
        const config = new Configuration({ php: command });
        const options = { cwd: '.' };
        return new ProcessBuilder(
            config,
            options,
            new PathReplacer(options, config.get('paths') as Path),
        );
    };

    it('clears once for multiple processes in the same request', () => {
        const { observer, outputChannel } = createObserver();

        observer.run(createBuilder('command-1'));
        observer.run(createBuilder('command-2'));

        expect(outputChannel.clear).toHaveBeenCalledTimes(1);
    });

    it('should show output channel when continuous is undefined (standard run)', () => {
        const { observer, outputChannel } = createObserver(
            { showAfterExecution: 'always' },
            {} as TestRunRequest,
        );

        observer.run(createBuilder('command-1'));

        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should not show output channel when continuous is true', () => {
        const { observer, outputChannel } = createObserver({ showAfterExecution: 'always' }, {
            continuous: true,
        } as TestRunRequest);

        observer.run(createBuilder('command-1'));

        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('each observer instance clears independently', () => {
        const { outputChannel } = createObserver();
        const config = {
            clearOutputOnRun: true,
            showAfterExecution: 'onFailure',
        };
        const configuration = new Configuration(config);
        const observer1 = new OutputChannelObserver(
            outputChannel,
            configuration,
            new PrettyPrinter(new PHPUnitXML()),
            { continuous: false } as TestRunRequest,
        );
        const observer2 = new OutputChannelObserver(
            outputChannel,
            configuration,
            new PrettyPrinter(new PHPUnitXML()),
            { continuous: false } as TestRunRequest,
        );

        observer1.run(createBuilder('command-1'));
        observer2.run(createBuilder('command-2'));

        expect(outputChannel.clear).toHaveBeenCalledTimes(2);
    });
});

describe.each(detectPhpUnitStubs())('OutputChannelObserver on $name (PHPUnit $phpUnitVersion)', ({
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
            clearOutputOnRun: true,
            showAfterExecution: 'onFailure',
        });
        testRunner = new TestRunner();
        outputChannel = vscode.window.createOutputChannel('phpunit');
        const observer = new OutputChannelObserver(
            outputChannel,
            configuration,
            new PrettyPrinter(new PHPUnitXML()),
            { continuous: false } as TestRunRequest,
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
        expect(outputChannel.clear).toHaveBeenCalled();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(
                new RegExp(
                    `php .+phpunit .+${testFile.replace(/[/\\]/g, '.')} --colors=never --teamcity`,
                ),
            ),
        );
    });

    it('should trigger testVersion', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/PHPUnit\s[\d.]+/),
        );
    });

    it('should trigger testRuntime', async () => {
        if (semverLt(phpUnitVersion, '10.0.0')) {
            return;
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
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
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/Configuration:.+/),
        );
    });

    it('should trigger testSuiteStarted', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::test_passed',
        );
    });

    it('should trigger testSuiteStarted without method', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'addition_provider|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::addition_provider',
        );
    });

    it('should trigger testFinished', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+✅\spassed\s\d+\sms/),
        );
    });

    it('should trigger testFailed', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+❌\sfailed\s\d+\sms/),
        );
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining(
                [
                    `     ┐ `,
                    `     ├ Failed asserting that false is true.`,
                    `     │ `,
                    `     │ ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 27)}`,
                ].join(EOL),
            ),
        );
    });

    it('should trigger testFailed with actual and expect', async () => {
        let DOT = '';
        let ARRAY_OPEN = '(';
        let ARRAY_CLOSE = ')';
        if (semverGte(phpUnitVersion, '10.4.2')) {
            DOT = ',';
            ARRAY_OPEN = '[';
            ARRAY_CLOSE = ']';
        }

        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_is_not_same';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+❌\sis_not_same\s\d+\sms/),
        );
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringContaining(
                [
                    `     ┐ `,
                    `     ├ Failed asserting that two arrays are identical.`,
                    `     ┊ ---·Expected Array &0 ${ARRAY_OPEN}`,
                    `     ┊     'a' => 'b'${DOT}`,
                    `     ┊     'c' => 'd'${DOT}`,
                    `     ┊ ${ARRAY_CLOSE}`,
                    `     ┊ +++·Actual Array &0 ${ARRAY_OPEN}`,
                    `     ┊     'e' => 'f'${DOT}`,
                    `     ┊     0 => 'g'${DOT}`,
                    `     ┊     1 => 'h'${DOT}`,
                    `     ┊ ${ARRAY_CLOSE}`,
                    `     │ `,
                    `     │ ${OutputFormatter.fileFormat(phpUnitProject('tests/AssertionsTest.php'), 32)}`,
                ].join(EOL),
            ),
        );
    });

    it('should trigger testIgnored', async () => {
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_skipped';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+➖\sskipped\s\d+\sms/),
        );
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
        expect(outputChannel.clear).toHaveBeenCalled();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringMatching('❌'));
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/NotFound\.php/),
        );
    });

    it('always show output channel', async () => {
        await configuration.update('showAfterExecution', 'always');
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalledWith(true);
    });

    it('should not show output channel when successful', async () => {
        await configuration.update('showAfterExecution', 'onFailure');
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('should show output channel when failure', async () => {
        await configuration.update('showAfterExecution', 'onFailure');
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should show output channel when file not found', async () => {
        await configuration.update('showAfterExecution', 'onFailure');
        const testFile = phpUnitProject('tests/NotFound.php');
        await run(testFile, undefined);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('never show output channel when successful', async () => {
        await configuration.update('showAfterExecution', 'never');
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('never show output channel when failure', async () => {
        await configuration.update('showAfterExecution', 'never');
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('never show output channel when not found', async () => {
        await configuration.update('showAfterExecution', 'never');
        const testFile = phpUnitProject('tests/NotFound.php');
        await run(testFile, undefined);

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('should not clear output channel', async () => {
        await configuration.update('clearOutputOnRun', false);
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.clear).not.toHaveBeenCalled();
    });

    it('should print printed output', async () => {
        const testFile = phpUnitProject('tests/Output/OutputTest.php');
        const filter = 'test_echo';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith('🟨 printed output');
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should print printed output when die', async () => {
        const testFile = phpUnitProject('tests/Output/OutputTest.php');
        const filter = 'test_die';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        if (semverGte(phpUnitVersion, '12.0.0')) {
            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringMatching(/🟨 printed output when die/),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringMatching(/Fatal error: Premature end of PHP process/),
            );
        } else {
            expect(outputChannel.appendLine).toHaveBeenCalledWith('🟨 printed output when die');
        }
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should print dump output', async () => {
        const testFile = phpUnitProject('tests/Output/OutputTest.php');
        const filter = 'test_dump';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/🟨 array:\d+ \[/),
        );
        expect(outputChannel.show).toHaveBeenCalled();
    });
});
