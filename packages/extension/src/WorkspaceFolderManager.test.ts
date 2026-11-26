import type { Container } from 'inversify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    type CancellationToken,
    type EventEmitter,
    type TestController,
    TestRunRequest,
    tests,
    Uri,
    window,
    workspace,
} from 'vscode';
import { changeWorkspaceFolders } from '../fakes/vscodeEvents';
import { createParentContainer } from './container';
import { TestWatchManager } from './TestDiscovery';
import { TestRunHandler } from './TestExecution';
import { TYPES } from './types';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

const makeFolder = (name: string, path: string) => ({
    index: 0,
    name,
    uri: Uri.file(path),
});

const setWorkspaceFolders = (...folders: ReturnType<typeof makeFolder>[]) => {
    Object.defineProperty(workspace, 'workspaceFolders', { value: folders });
    Object.defineProperty(workspace, 'textDocuments', { value: [] });
};

type FakeWatcher = { disposed: boolean };
const createdWatchers = () =>
    (workspace as unknown as { createdWatchers: FakeWatcher[] }).createdWatchers;

const watchersCreatedDuring = async (fn: () => Promise<void>) => {
    const before = createdWatchers().length;
    await fn();
    return createdWatchers().slice(before);
};

const expectContinuousRunOnFileChange = async (child: Container) => {
    const startTestRun = vi
        .spyOn(child.get(TestRunHandler), 'startTestRun')
        .mockResolvedValue(undefined);
    const cancellation = { onCancellationRequested: vi.fn() } as unknown as CancellationToken;
    child.get(TestWatchManager).handleContinuousRun(new TestRunRequest(), cancellation);

    child.get<EventEmitter<Uri>>(TYPES.FileChangedEmitter).fire(Uri.file('/x/tests/FooTest.php'));

    await vi.waitFor(() => expect(startTestRun).toHaveBeenCalledTimes(1));
};

describe('WorkspaceFolderManager', () => {
    let ctrl: TestController;
    let manager: WorkspaceFolderManager;

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
        const outputChannel = window.createOutputChannel('PHPUnit');
        const parentContainer = createParentContainer(ctrl, outputChannel);
        manager = parentContainer.get(WorkspaceFolderManager);
    });

    describe('initialize', () => {
        it('initializes single folder without folder root items', async () => {
            setWorkspaceFolders(makeFolder('a', '/a'));

            await manager.initialize();

            expect(manager.getAll()).toHaveLength(1);
            expect(ctrl.items.size).toBe(0);
        });

        it('initializes multi folders with folder root items', async () => {
            setWorkspaceFolders(makeFolder('a', '/a'), makeFolder('b', '/b'));

            await manager.initialize();

            expect(manager.getAll()).toHaveLength(2);
            expect(ctrl.items.size).toBe(2);
        });
    });

    describe('operation queue', () => {
        it('enqueue rejects for the failing caller only and keeps the queue running', async () => {
            const failing = manager.enqueue(async () => {
                throw new Error('broken phpunit.xml');
            });
            const next = vi.fn().mockResolvedValue(undefined);

            await expect(failing).rejects.toThrow('broken phpunit.xml');
            await expect(manager.enqueue(next)).resolves.toBeUndefined();
            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe('folders added after activation', () => {
        const a = makeFolder('a', '/a');
        const b = makeFolder('b', '/b');
        const c = makeFolder('c', '/c');

        const addFolder = async (added: typeof a) => {
            await changeWorkspaceFolders({ added: [added] });
            await manager.enqueue(async () => {});
            return manager.getByKey(added.uri.toString()) as Container;
        };

        it('triggers continuous run for a folder added to a multi-root workspace', async () => {
            setWorkspaceFolders(a, b);
            await manager.initialize();
            manager.registerFolderChangeListener();

            const child = await addFolder(c);

            await expectContinuousRunOnFileChange(child);
        });

        it('starts watching a folder added to a single-root workspace', async () => {
            setWorkspaceFolders(a);
            await manager.initialize();
            manager.registerFolderChangeListener();

            const watchers = await watchersCreatedDuring(async () => {
                await addFolder(b);
            });

            expect(watchers.length).toBeGreaterThan(0);
        });

        it('disposes watchers of an added folder when it is removed', async () => {
            setWorkspaceFolders(a, b);
            await manager.initialize();
            manager.registerFolderChangeListener();
            const watchers = await watchersCreatedDuring(async () => {
                await addFolder(c);
            });
            expect(watchers.length).toBeGreaterThan(0);

            await changeWorkspaceFolders({ removed: [c] });
            await manager.enqueue(async () => {});

            expect(watchers.every((w) => w.disposed)).toBe(true);
        });
    });

    describe('dispose', () => {
        it('clears all folders', async () => {
            setWorkspaceFolders(makeFolder('a', '/a'), makeFolder('b', '/b'));

            await manager.initialize();

            manager.dispose();

            expect(manager.getAll()).toHaveLength(0);
        });
    });
});
