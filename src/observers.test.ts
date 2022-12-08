import { describe } from '@jest/globals';
import { TestRunner } from './phpunit/test-runner';
import { LocalCommand } from './phpunit/command';
import { Configuration } from './phpunit/configuration';
import { projectPath } from './phpunit/__tests__/helper';
import { EOL, OutputChannelObserver } from './observers';
import * as vscode from 'vscode';
import { OutputChannel } from 'vscode';

describe('OutputChannelObserver', () => {
    function getOutputChannel(): OutputChannel {
        return (vscode.window.createOutputChannel as jest.Mock).mock.results[0].value;
    }

    function debug(outputChannel: OutputChannel) {
        console.log((outputChannel.appendLine as jest.Mock).mock.calls);
        console.log((outputChannel.append as jest.Mock).mock.calls);
    }

    async function run(
        file?: string,
        filter?: string,
        config: { [p: string]: string | string[] | boolean } = {}
    ) {
        const configuration = new Configuration({
            php: 'php',
            phpunit: 'vendor/bin/phpunit',
            args: ['-c', 'phpunit.xml'],
            clearOutputOnRun: true,
            showAfterExecution: 'onFailure',
            ...config,
        });

        if (filter) {
            filter = `--filter="^.*::(${filter})( with data set .*)?$"`;
        }

        const outputChannel = vscode.window.createOutputChannel('phpunit');
        const observer = new OutputChannelObserver(outputChannel, configuration);

        const cwd = projectPath('');
        const command = new LocalCommand(configuration, { cwd });
        command.setArguments([file, filter].join(' '));

        const testRunner = new TestRunner();
        testRunner.observe(observer);

        await testRunner.run(command);
    }

    it('should trigger input', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);
        const outputChannel = getOutputChannel();
        expect(outputChannel.clear).toHaveBeenCalled();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            `php vendor/bin/phpunit ${testFile} --configuration=phpunit.xml --teamcity --colors=never`
        );
    });

    it('should trigger testVersion', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/PHPUnit\s[\d.]+/)
        );
    });

    it('should trigger testRuntime', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/Runtime:\s+PHP\s[\d.]+/)
        );
    });

    it('should trigger testConfiguration', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/Configuration:.+/)
        );
    });

    it('should trigger testSuiteStarted', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::test_passed'
        );
    });

    it('should trigger testSuiteStarted without method', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'addition_provider|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).not.toHaveBeenCalledWith(
            'Recca0120\\\\VSCode\\\\Tests\\\\AssertionsTest::addition_provider'
        );
    });

    it('should trigger testFinished', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+✅\spassed\s\d+\sms/)
        );
    });

    it('should trigger testFailed', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+❌\sfailed\s\d+\sms/)
        );
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringContaining(
                `     ┐ ${EOL}` +
                    `     ├ Failed asserting that false is true.${EOL}` +
                    `     │ ${EOL}` +
                    `     │ ${projectPath('tests/AssertionsTest.php')}:22${EOL}`
            )
        );
    });

    it('should trigger testFailed with actual and expect', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_is_not_same';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+❌\sis_not_same\s\d+\sms/)
        );
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringContaining(
                `     ┐ ${EOL}` +
                    `     ├ Failed asserting that two arrays are identical.${EOL}` +
                    `     ┊ ---·Expected Array &0 (${EOL}` +
                    `     ┊     'a' => 'b'${EOL}` +
                    `     ┊     'c' => 'd'${EOL}` +
                    `     ┊ )${EOL}` +
                    `     ┊ +++·Actual Array &0 (${EOL}` +
                    `     ┊     'e' => 'f'${EOL}` +
                    `     ┊     0 => 'g'${EOL}` +
                    `     ┊     1 => 'h'${EOL}` +
                    `     ┊ )${EOL}` +
                    `     │ ${EOL}` +
                    `     │ ${projectPath('tests/AssertionsTest.php')}:27${EOL}`
            )
        );
    });

    it('should trigger testIgnored', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_skipped';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/\s+➖\sskipped\s\d+\sms/)
        );
    });

    it('should trigger testResultSummary', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/Tests: \d+, Assertions: \d+/)
        );
    });

    it('should trigger timeAndMemory', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.appendLine).toHaveBeenCalledWith(
            expect.stringMatching(/Time: [\d:.]+(\s\w+)?, Memory: [\d.]+\s\w+/)
        );
    });

    it('should trigger error', async () => {
        const testFile = projectPath('tests/NotFound.php');
        await run(testFile);

        const outputChannel = getOutputChannel();
        expect(outputChannel.clear).toHaveBeenCalled();
        expect(outputChannel.append).toHaveBeenCalledWith(expect.stringMatching('❌'));
        expect(outputChannel.append).toHaveBeenCalledWith(
            expect.stringMatching(/Cannot open file .*NotFound\.php/)
        );
    });

    it('always show output channel', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter, { showAfterExecution: 'always' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should not show output channel when successful', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter, { showAfterExecution: 'onFailure' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('should show output channel when failure', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter, { showAfterExecution: 'onFailure' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('should show output channel when failure', async () => {
        const testFile = projectPath('tests/NotFound.php');
        await run(testFile, undefined, { showAfterExecution: 'onFailure' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).toHaveBeenCalled();
    });

    it('never show output channel when successful', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter, { showAfterExecution: 'never' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('never show output channel when failure', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_failed|test_passed';
        await run(testFile, filter, { showAfterExecution: 'never' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('never show output channel when failure', async () => {
        const testFile = projectPath('tests/NotFound.php');
        await run(testFile, undefined, { showAfterExecution: 'never' });

        const outputChannel = getOutputChannel();
        expect(outputChannel.show).not.toHaveBeenCalled();
    });

    it('should not clear output channel', async () => {
        const testFile = projectPath('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter, { clearOutputOnRun: false });

        const outputChannel = getOutputChannel();
        expect(outputChannel.clear).not.toHaveBeenCalled();
    });
});
