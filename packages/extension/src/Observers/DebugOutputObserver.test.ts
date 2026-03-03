import {
    Configuration,
    type Path,
    PathReplacer,
    ProcessBuilder,
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestStarted,
} from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TestItem } from 'vscode';
import * as vscode from 'vscode';
import { DebugOutputObserver } from './DebugOutputObserver';

const createTestItem = (id: string): TestItem => ({ id }) as TestItem;

const createBuilder = (command = 'php') => {
    const config = new Configuration({ php: command });
    const options = { cwd: '.' };
    return new ProcessBuilder(
        config,
        options,
        new PathReplacer(options, config.get('paths') as Path),
    );
};

const makeStarted = (id: string, locationHint: string, file: string): TestStarted => ({
    event: TeamcityEvent.testStarted,
    name: id.split('::').pop() ?? id,
    flowId: 1,
    id,
    file,
    locationHint,
});

const makeFinished = (id: string, locationHint: string, file: string): TestFinished => ({
    event: TeamcityEvent.testFinished,
    name: id.split('::').pop() ?? id,
    flowId: 1,
    id,
    file,
    locationHint,
    duration: 10,
});

const makeFailed = (id: string, locationHint: string, file: string): TestFailed => ({
    event: TeamcityEvent.testFailed,
    name: id.split('::').pop() ?? id,
    flowId: 1,
    id,
    file,
    locationHint,
    message: 'assertion failed',
    details: [],
    duration: 10,
});

const makeIgnored = (id: string, locationHint: string, file: string): TestIgnored => ({
    event: TeamcityEvent.testIgnored,
    name: id.split('::').pop() ?? id,
    flowId: 1,
    id,
    file,
    locationHint,
    message: 'skipped',
    details: [],
    duration: 0,
});

describe('DebugOutputObserver', () => {
    const ID = 'Tests\\Feature\\ExampleTest::test_foo';
    const LOCATION_HINT = `php_qn:///var/www/html/tests/Feature/ExampleTest.php::Tests\\Feature\\ExampleTest::test_foo`;
    const FILE = '/local/tests/Feature/ExampleTest.php';

    // biome-ignore lint/suspicious/noExplicitAny: test mock type
    let outputChannel: any;
    let configuration: Configuration;

    beforeEach(() => {
        outputChannel = vscode.window.createOutputChannel('PHPUnit Debug');
        configuration = new Configuration({ clearDebugOutputOnRun: true });
    });

    describe('run()', () => {
        it('logs the command', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.run(createBuilder('php'));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('php'));
        });

        it('logs queue keys when testItemById is not empty', () => {
            const testItemById = new Map([[ID, createTestItem(ID)]]);
            const observer = new DebugOutputObserver(outputChannel, configuration, testItemById);
            observer.run(createBuilder('php'));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[Queue]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining(ID));
        });

        it('does not log queue section when testItemById is empty', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.run(createBuilder('php'));

            expect(outputChannel.appendLine).not.toHaveBeenCalledWith(
                expect.stringContaining('[Queue]'),
            );
        });

        it('clears output once per request when clearDebugOutputOnRun is true', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.run(createBuilder('cmd-1'));
            observer.run(createBuilder('cmd-2'));

            expect(outputChannel.clear).toHaveBeenCalledTimes(1);
        });
    });

    describe('testStarted()', () => {
        it('logs ✓ found when testItem exists', () => {
            const testItemById = new Map([[ID, createTestItem(ID)]]);
            const observer = new DebugOutputObserver(outputChannel, configuration, testItemById);
            observer.testStarted?.(makeStarted(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testStarted]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✓'));
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining(ID));
            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining(LOCATION_HINT),
            );
        });

        it('logs ✗ not found when testItem missing', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.testStarted?.(makeStarted(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testStarted]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✗'));
        });
    });

    describe('testFinished()', () => {
        it('logs ✓ found when testItem exists', () => {
            const testItemById = new Map([[ID, createTestItem(ID)]]);
            const observer = new DebugOutputObserver(outputChannel, configuration, testItemById);
            observer.testFinished?.(makeFinished(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testFinished]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✓'));
        });

        it('logs ✗ not found when testItem missing', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.testFinished?.(makeFinished(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testFinished]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✗'));
        });
    });

    describe('testFailed()', () => {
        it('logs ✗ not found when testItem missing', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.testFailed?.(makeFailed(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testFailed]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✗'));
        });
    });

    describe('testIgnored()', () => {
        it('logs ✗ not found when testItem missing', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());
            observer.testIgnored?.(makeIgnored(ID, LOCATION_HINT, FILE));

            expect(outputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[testIgnored]'),
            );
            expect(outputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('✗'));
        });
    });

    describe('line()', () => {
        it('does not implement line handler', () => {
            const observer = new DebugOutputObserver(outputChannel, configuration, new Map());

            expect('line' in observer).toBe(false);
        });
    });
});
