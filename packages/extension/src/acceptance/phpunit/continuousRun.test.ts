import { spawn } from 'node:child_process';
import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { CancellationTokenSource, type ExtensionContext, Uri, workspace } from 'vscode';
import { createExtensionContext } from '../../../fakes/extensionContext';
import { openWorkspace } from '../../../fakes/openWorkspace';
import { findItem } from '../../../test-support/testItems';
import { activateExtension, type Extension } from '../harness';
import { stubs } from '../support';

type FakeWatcher = { fireChange: (uri: Uri) => void; pattern: { pattern: string } };

describe.each(stubs.phpUnit)('PHPUnit $name ($phpUnitVersion)', ({ root, binary, args }) => {
    let context: ExtensionContext;

    beforeAll(async () => initTreeSitter());

    beforeEach(async () => {
        context = createExtensionContext();
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    const activateAndResolve = async () => {
        const watchers = (workspace as unknown as { createdWatchers: FakeWatcher[] })
            .createdWatchers;
        const before = watchers.length;
        const extension = await activateExtension(context);
        await extension.resolve();
        const testWatchers = watchers
            .slice(before)
            .filter(({ pattern }) => !pattern.pattern.includes('.xml'));
        const changeFile = (file: string) => {
            for (const watcher of testWatchers) {
                watcher.fireChange(Uri.file(phpUnitProject(file)));
            }
        };
        return { extension, changeFile };
    };

    const waitForTestRuns = (extension: Extension, count: number) =>
        vi.waitFor(
            () => {
                const testRuns = (extension.controller.createTestRun as Mock).mock.results;
                expect(testRuns).toHaveLength(count);
                expect(testRuns[count - 1].value.end).toHaveBeenCalled();
            },
            { timeout: 10_000 },
        );

    const spawnedFiles = () =>
        vi
            .mocked(spawn)
            .mock.calls.flatMap(([, spawnArgs]) => spawnArgs as string[])
            .filter((arg) => arg.endsWith('Test.php'));

    describe('continuous run of selected tests', () => {
        it('reruns the watched test class when its file changes', async () => {
            const { extension, changeFile } = await activateAndResolve();
            const calculator = findItem(
                extension.controller.items,
                'Calculator (Tests\\Calculator)',
            );
            await extension.run([calculator], { continuous: true });
            vi.mocked(spawn).mockClear();

            changeFile('tests/CalculatorTest.php');
            await waitForTestRuns(extension, 1);

            expect(spawnedFiles()).toEqual([
                Uri.file(phpUnitProject('tests/CalculatorTest.php')).fsPath,
            ]);
        });

        it('does not rerun when a file that is not watched changes', async () => {
            const { extension, changeFile } = await activateAndResolve();
            const calculator = findItem(
                extension.controller.items,
                'Calculator (Tests\\Calculator)',
            );
            await extension.run([calculator], { continuous: true });
            vi.mocked(spawn).mockClear();

            changeFile('tests/AssertionsTest.php');
            changeFile('tests/CalculatorTest.php');
            await waitForTestRuns(extension, 1);

            expect(spawnedFiles()).toEqual([
                Uri.file(phpUnitProject('tests/CalculatorTest.php')).fsPath,
            ]);
        });

        it('stops rerunning a test class once its continuous run is cancelled', async () => {
            const { extension, changeFile } = await activateAndResolve();
            const { items } = extension.controller;
            const calculatorRun = new CancellationTokenSource();
            await extension.run([findItem(items, 'Calculator (Tests\\Calculator)')], {
                continuous: true,
                token: calculatorRun.token,
            });
            await extension.run([findItem(items, 'Assertions (Tests\\Assertions)')], {
                continuous: true,
            });
            calculatorRun.cancel();
            vi.mocked(spawn).mockClear();

            changeFile('tests/CalculatorTest.php');
            changeFile('tests/AssertionsTest.php');
            await waitForTestRuns(extension, 1);

            expect(spawnedFiles()).toEqual([
                Uri.file(phpUnitProject('tests/AssertionsTest.php')).fsPath,
            ]);
        });
    });
});
