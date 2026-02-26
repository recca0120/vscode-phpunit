import {
    Configuration,
    type Path,
    PathReplacer,
    ProcessBuilder,
    TestRunner,
} from '@vscode-phpunit/phpunit';
import { detectPhpUnitStubs, phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import type { OutputChannel } from 'vscode';
import * as vscode from 'vscode';
import { OutputChannelObserver } from './OutputChannelObserver';

describe('OutputChannelObserver clear behavior', () => {
    const createObserver = (config: Record<string, unknown> = {}) => {
        const outputChannel = vscode.window.createOutputChannel('phpunit');
        const configuration = new Configuration({
            clearOutputOnRun: true,
            ...config,
        });
        const observer = new OutputChannelObserver(outputChannel, configuration);

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

    it('each observer instance clears independently', () => {
        const outputChannel = vscode.window.createOutputChannel('phpunit');
        const configuration = new Configuration({ clearOutputOnRun: true });
        const observer1 = new OutputChannelObserver(outputChannel, configuration);
        const observer2 = new OutputChannelObserver(outputChannel, configuration);

        observer1.run(createBuilder('command-1'));
        observer2.run(createBuilder('command-2'));

        expect(outputChannel.clear).toHaveBeenCalledTimes(2);
    });
});

describe.each(detectPhpUnitStubs())('OutputChannelObserver on $name (PHPUnit $phpUnitVersion)', ({
    root,
    binary,
    args: stubArgs,
}) => {
    let testRunner: TestRunner;
    let configuration: Configuration;

    beforeEach(() => {
        configuration = new Configuration({
            php: 'php',
            phpunit: binary,
            args: ['-c', 'phpunit.xml', ...stubArgs],
            clearOutputOnRun: true,
        });
        testRunner = new TestRunner();
        const outputChannel = vscode.window.createOutputChannel('phpunit');
        const observer = new OutputChannelObserver(outputChannel, configuration);
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

    it('should not clear output channel', async () => {
        await configuration.update('clearOutputOnRun', false);
        const testFile = phpUnitProject('tests/AssertionsTest.php');
        const filter = 'test_passed';
        await run(testFile, filter);

        const outputChannel = getOutputChannel();
        expect(outputChannel.clear).not.toHaveBeenCalled();
    });
});
