import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type TestController, tests, Uri, workspace } from 'vscode';
import { createParentContainer } from './container';
import { WorkspaceFolderManager } from './WorkspaceFolderManager';

const makeFolder = (name: string, path: string) => ({
    index: 0,
    name,
    uri: Uri.file(path),
});

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
            const folder1 = makeFolder('a', '/a');
            Object.defineProperty(workspace, 'workspaceFolders', { value: [folder1] });
            Object.defineProperty(workspace, 'textDocuments', { value: [] });

            await manager.initialize({
                subscriptions: [],
            } as unknown as import('vscode').ExtensionContext);

            expect(manager.getAll()).toHaveLength(1);
            expect(ctrl.items.size).toBe(0);
        });

        it('initializes multi folders with folder root items', async () => {
            const folder1 = makeFolder('a', '/a');
            const folder2 = makeFolder('b', '/b');
            Object.defineProperty(workspace, 'workspaceFolders', { value: [folder1, folder2] });
            Object.defineProperty(workspace, 'textDocuments', { value: [] });

            await manager.initialize({
                subscriptions: [],
            } as unknown as import('vscode').ExtensionContext);

            expect(manager.getAll()).toHaveLength(2);
            expect(ctrl.items.size).toBe(2);
        });
    });

    describe('setupControllerHandlers', () => {
        it('sets refreshHandler and resolveHandler on ctrl', () => {
            Object.defineProperty(workspace, 'workspaceFolders', {
                value: [makeFolder('a', '/a')],
            });
            Object.defineProperty(workspace, 'textDocuments', { value: [] });

            manager.setupControllerHandlers({
                subscriptions: [],
            } as unknown as import('vscode').ExtensionContext);

            expect(ctrl.refreshHandler).toBeTypeOf('function');
            expect(ctrl.resolveHandler).toBeTypeOf('function');
        });
    });

    describe('getContextForUri', () => {
        it('returns FolderTestContext for correct folder', async () => {
            const folder1 = makeFolder('a', '/a');
            Object.defineProperty(workspace, 'workspaceFolders', { value: [folder1] });
            Object.defineProperty(workspace, 'textDocuments', { value: [] });

            await manager.initialize({
                subscriptions: [],
            } as unknown as import('vscode').ExtensionContext);

            const ctx = manager.getContextForUri(Uri.file('/a/test.php'));

            expect(ctx).toBeDefined();
            expect(ctx?.findTestsByFile).toBeTypeOf('function');
            expect(ctx?.findTestsByPosition).toBeTypeOf('function');
            expect(ctx?.findTestsByRequest).toBeTypeOf('function');
            expect(ctx?.getPreviousRequest).toBeTypeOf('function');
            expect(ctx?.getLastRunAt).toBeTypeOf('function');
        });

        it('returns undefined for unknown uri', () => {
            const ctx = manager.getContextForUri(Uri.file('/unknown/test.php'));

            expect(ctx).toBeUndefined();
        });
    });

    describe('dispose', () => {
        it('clears all folders', async () => {
            const folder1 = makeFolder('a', '/a');
            const folder2 = makeFolder('b', '/b');
            Object.defineProperty(workspace, 'workspaceFolders', { value: [folder1, folder2] });
            Object.defineProperty(workspace, 'textDocuments', { value: [] });

            await manager.initialize({
                subscriptions: [],
            } as unknown as import('vscode').ExtensionContext);

            manager.dispose();

            expect(manager.getAll()).toHaveLength(0);
        });
    });
});
