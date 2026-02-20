import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CancellationToken, TestItem, TestRunRequest, WorkspaceFolder } from 'vscode';
import { workspace } from 'vscode';
import { URI } from 'vscode-uri';
import { TYPES } from '../types';
import type { WorkspaceFolderManager } from '../WorkspaceFolderManager';
import { TestRunDispatcher } from './TestRunDispatcher';
import { TestRunHandler } from './TestRunHandler';

function createDeferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    return { promise, resolve };
}

function createFakeContainer(
    folderUri: string,
    handler: { startTestRun: ReturnType<typeof vi.fn> },
) {
    const uri = URI.file(folderUri);
    const folder = { uri, name: folderUri, index: 0 } as WorkspaceFolder;
    return {
        get: (token: unknown) => {
            if (token === TestRunHandler) return handler;
            if (token === TYPES.WorkspaceFolder) return folder;
            throw new Error(`Unexpected token: ${String(token)}`);
        },
    };
}

function createTestItem(id: string, uriPath: string): TestItem {
    return {
        id,
        uri: URI.file(uriPath),
        children: { size: 0, [Symbol.iterator]: () => [][Symbol.iterator]() },
    } as unknown as TestItem;
}

describe('TestRunDispatcher', () => {
    let handlerA: { startTestRun: ReturnType<typeof vi.fn> };
    let handlerB: { startTestRun: ReturnType<typeof vi.fn> };
    let dispatcher: TestRunDispatcher;

    beforeEach(() => {
        handlerA = { startTestRun: vi.fn() };
        handlerB = { startTestRun: vi.fn() };

        const containerA = createFakeContainer('/workspace/folder-a', handlerA);
        const containerB = createFakeContainer('/workspace/folder-b', handlerB);

        const folderAUri = URI.file('/workspace/folder-a');
        const folderBUri = URI.file('/workspace/folder-b');

        (workspace as unknown as { workspaceFolders: WorkspaceFolder[] }).workspaceFolders = [
            { uri: folderAUri, name: 'folder-a', index: 0 },
            { uri: folderBUri, name: 'folder-b', index: 1 },
        ];

        const folderManager = {
            getAll: () => [containerA, containerB],
            getByKey: (key: string) => {
                if (key === folderAUri.toString()) return containerA;
                if (key === folderBUri.toString()) return containerB;
                return undefined;
            },
        } as unknown as WorkspaceFolderManager;

        dispatcher = new TestRunDispatcher(folderManager);
    });

    it('should dispatch run-all across folders in parallel', async () => {
        const deferredA = createDeferred();
        const deferredB = createDeferred();
        let concurrency = 0;
        let maxConcurrency = 0;

        handlerA.startTestRun.mockImplementation(async () => {
            concurrency++;
            maxConcurrency = Math.max(maxConcurrency, concurrency);
            await deferredA.promise;
            concurrency--;
        });

        handlerB.startTestRun.mockImplementation(async () => {
            concurrency++;
            maxConcurrency = Math.max(maxConcurrency, concurrency);
            await deferredB.promise;
            concurrency--;
        });

        const request = { continuous: false } as TestRunRequest;
        const cancellation = {} as CancellationToken;

        const dispatchPromise = dispatcher.dispatch(request, cancellation);

        await vi.waitFor(() => {
            expect(handlerA.startTestRun).toHaveBeenCalledTimes(1);
            expect(handlerB.startTestRun).toHaveBeenCalledTimes(1);
        });

        expect(maxConcurrency).toBe(2);

        deferredA.resolve();
        deferredB.resolve();
        await dispatchPromise;
    });

    it('should dispatch include-based runs across folders in parallel', async () => {
        const deferredA = createDeferred();
        const deferredB = createDeferred();
        let concurrency = 0;
        let maxConcurrency = 0;

        handlerA.startTestRun.mockImplementation(async () => {
            concurrency++;
            maxConcurrency = Math.max(maxConcurrency, concurrency);
            await deferredA.promise;
            concurrency--;
        });

        handlerB.startTestRun.mockImplementation(async () => {
            concurrency++;
            maxConcurrency = Math.max(maxConcurrency, concurrency);
            await deferredB.promise;
            concurrency--;
        });

        const itemA = createTestItem('test-a', '/workspace/folder-a/tests/FooTest.php');
        const itemB = createTestItem('test-b', '/workspace/folder-b/tests/BarTest.php');

        const request = {
            include: [itemA, itemB],
            exclude: [],
            profile: undefined,
            continuous: false,
        } as unknown as TestRunRequest;
        const cancellation = {} as CancellationToken;

        const dispatchPromise = dispatcher.dispatch(request, cancellation);

        await vi.waitFor(() => {
            expect(handlerA.startTestRun).toHaveBeenCalledTimes(1);
            expect(handlerB.startTestRun).toHaveBeenCalledTimes(1);
        });

        expect(maxConcurrency).toBe(2);

        deferredA.resolve();
        deferredB.resolve();
        await dispatchPromise;
    });
});
