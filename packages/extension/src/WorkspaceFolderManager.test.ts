import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type TestController, tests, Uri, workspace } from 'vscode';
import { createParentContainer } from './container';
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

describe('WorkspaceFolderManager', () => {
    let ctrl: TestController;
    let manager: WorkspaceFolderManager;

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
        const outputChannel = {
            append: vi.fn(),
            appendLine: vi.fn(),
            clear: vi.fn(),
            show: vi.fn(),
        } as unknown as import('vscode').OutputChannel;
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

    describe('dispose', () => {
        it('clears all folders', async () => {
            setWorkspaceFolders(makeFolder('a', '/a'), makeFolder('b', '/b'));

            await manager.initialize();

            manager.dispose();

            expect(manager.getAll()).toHaveLength(0);
        });
    });
});
