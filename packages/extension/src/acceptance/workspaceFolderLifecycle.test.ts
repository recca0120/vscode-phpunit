import { initTreeSitter } from '@vscode-phpunit/phpunit';
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { commands, type ExtensionContext, Uri, type WorkspaceFolder, workspace } from 'vscode';
import { createExtensionContext } from '../../fakes/extensionContext';
import { openWorkspace } from '../../fakes/openWorkspace';
import { changeWorkspaceFolders } from '../../fakes/vscodeEvents';
import { activateExtension } from './harness';
import { stubs } from './support';

type FakeFileSystemWatcher = { disposed: boolean };

let context: ExtensionContext;

beforeAll(async () => initTreeSitter());

beforeEach(() => {
    context = createExtensionContext();
});

describe('workspace folder lifecycle', {
    skip: stubs.phpUnit.length === 0,
}, () => {
    const [phpUnitStub] = stubs.phpUnit;
    const [pestStub] = stubs.pest;

    beforeEach(async () => {
        const { root, binary, args } = phpUnitStub;
        await openWorkspace({ root, settings: { php: 'php', phpunit: binary, args: args } });
    });
    afterEach(() => vi.clearAllMocks());

    const findFolderManager = () => {
        const pushMock = context.subscriptions.push as unknown as Mock;
        for (const call of pushMock.mock.calls) {
            for (const arg of call) {
                if (
                    arg &&
                    typeof arg === 'object' &&
                    typeof arg.dispose === 'function' &&
                    typeof arg[Symbol.iterator] === 'function'
                ) {
                    return arg;
                }
            }
        }
        return undefined;
    };

    it('disposing the folder manager clears the test tree', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        await extension.resolve();

        expect(controller.items.size).toBeGreaterThan(0);

        const folderManager = findFolderManager();
        expect(folderManager).toBeDefined();
        folderManager.dispose();

        expect(controller.items.size).toBe(0);
    });

    it('resolving again disposes the previous file watchers', async () => {
        const extension = await activateExtension(context);

        await extension.resolve();

        const firstWatchers = (workspace.createFileSystemWatcher as Mock).mock.results.map(
            (r) => r.value as FakeFileSystemWatcher,
        );

        await extension.resolve();

        for (const watcher of firstWatchers) {
            expect(watcher.disposed).toBe(true);
        }
    });

    it.skipIf(stubs.pest.length === 0)('handles folder changes one at a time', async () => {
        const phpUnitFolder: WorkspaceFolder = {
            index: 0,
            name: 'phpunit-stub',
            uri: Uri.file(phpUnitStub.root),
        };

        await openWorkspace({
            root: phpUnitStub.root,
            name: phpUnitFolder.name,
            settings: { php: 'php', phpunit: phpUnitStub.binary, args: phpUnitStub.args },
        });
        const _ext = await activateExtension(context);

        const pestFolder: WorkspaceFolder = {
            index: 1,
            name: 'pest-stub',
            uri: Uri.file(pestStub.root),
        };
        const pestConfig = workspace.getConfiguration('phpunit', pestFolder.uri);
        await pestConfig.update('php', 'php');
        await pestConfig.update('phpunit', pestStub.binary);
        await pestConfig.update('args', pestStub.args);

        const onFolderChange = workspace.onDidChangeWorkspaceFolders as Mock;
        const listenerCall = onFolderChange.mock.calls.find(
            (call: unknown[]) => typeof call[0] === 'function',
        );
        expect(listenerCall).toBeDefined();

        (
            workspace.findFiles as unknown as {
                _maxConcurrent: number;
                _concurrentCount: number;
            }
        )._maxConcurrent = 0;
        (
            workspace.findFiles as unknown as {
                _maxConcurrent: number;
                _concurrentCount: number;
            }
        )._concurrentCount = 0;

        await changeWorkspaceFolders({ added: [pestFolder] });

        await changeWorkspaceFolders({ removed: [pestFolder] });

        await commands.executeCommand('phpunit.reload');

        expect(
            (workspace.findFiles as unknown as { _maxConcurrent: number })._maxConcurrent,
        ).toBeLessThanOrEqual(2);
    });

    it('resolving creates file system watchers', async () => {
        const extension = await activateExtension(context);

        (workspace.findFiles as Mock).mockClear();

        await extension.resolve();

        expect(workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    it('refresh restores every item', async () => {
        const extension = await activateExtension(context);
        const { controller } = extension;
        await extension.resolve();

        const itemsBefore = controller.items.size;
        expect(itemsBefore).toBeGreaterThan(0);

        await extension.refresh();

        expect(controller.items.size).toBe(itemsBefore);
    });

    it('concurrent resolves leave a single set of watchers', async () => {
        const extension = await activateExtension(context);

        await extension.resolve();

        const p1 = extension.resolve();
        const p2 = extension.resolve();
        await Promise.all([p1, p2]);

        const allWatchers = (workspace.createFileSystemWatcher as Mock).mock.results.map(
            (r) => r.value as FakeFileSystemWatcher,
        );

        const undisposed = allWatchers.filter((w) => !w.disposed);
        expect(undisposed.length).toBe(2);
    });
});
