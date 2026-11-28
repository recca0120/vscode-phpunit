import { spawn } from 'node:child_process';
import { CloverParser, initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { commands, type ExtensionContext, TestRunProfileKind, Uri } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { fireFileEvent } from '../../../fakes/fileSystemWatchers';
import { openWorkspace, setActiveTextEditor } from '../../../fakes/openWorkspace';
import { expectSpawned } from '../../../test-support/process';
import { findItem } from '../../../test-support/testItems';
import { activateExtension } from '../harness';
import { methodFilter, stubs } from '../support';

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    describe('rerun', () => {
        it('phpunit.rerun runs the previous request again', async () => {
            const _ext = await activateExtension(context);
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });

            await commands.executeCommand('phpunit.run-test-at-cursor');

            vi.mocked(spawn).mockClear();

            await commands.executeCommand('phpunit.rerun');

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter('test_passed'),
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });

        it('a continuous run does not replace the request to rerun', async () => {
            const extension = await activateExtension(context);
            const { controller } = extension;
            await extension.resolve();
            setActiveTextEditor(phpUnitProject('tests/AssertionsTest.php'), {
                line: 17,
                character: 14,
            });
            await commands.executeCommand('phpunit.run-test-at-cursor');
            const calculator = findItem(controller.items, 'Calculator (Tests\\Calculator)');
            await extension.run([calculator], { continuous: true });
            vi.mocked(spawn).mockClear();
            fireFileEvent('change', phpUnitProject('tests/CalculatorTest.php'));
            await vi.waitFor(
                () => {
                    const testRuns = (controller.createTestRun as Mock).mock.results;
                    expect(testRuns).toHaveLength(2);
                    expect(testRuns[1].value.end).toHaveBeenCalled();
                },
                { timeout: 10_000 },
            );

            vi.mocked(spawn).mockClear();
            await commands.executeCommand('phpunit.rerun');

            expectSpawned({
                cwd: root,
                args: [
                    binary,
                    methodFilter('test_passed'),
                    Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
                    '--colors=always',
                    '--teamcity',
                ],
            });
        });

        it('phpunit.rerun keeps the coverage profile of the previous run', async () => {
            vi.spyOn(CloverParser.prototype, 'parseFile').mockResolvedValue([]);

            const extension = await activateExtension(context);
            const { controller } = extension;
            const include = [findItem(controller.items, 'Assertions (Tests\\Assertions)')];
            await extension.run(include, { kind: TestRunProfileKind.Coverage });

            vi.mocked(spawn).mockClear();
            await commands.executeCommand('phpunit.rerun');

            expectSpawned({
                cwd: root,
                args: [
                    '-dxdebug.mode=coverage',
                    binary,
                    /AssertionsTest\.php/,
                    '--colors=always',
                    '--teamcity',
                    '--coverage-clover',
                    /\.phpunit\.cache[/\\]coverage-.+-0\.xml/,
                ],
                env: { XDEBUG_MODE: 'coverage' },
            });
        });
    });
});
