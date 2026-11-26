import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancellationTokenSource, EventEmitter, TestRunRequest, Uri, window } from 'vscode';
import type { TestRunHandler } from '../TestExecution';
import type { TestTree } from '../TestTree';
import { TestWatchManager } from './TestWatchManager';

function createMockHandler() {
    return { startTestRun: vi.fn().mockResolvedValue(undefined) };
}

function createMockTestTree() {
    return { findTestsByFile: vi.fn().mockReturnValue([]) } as unknown as TestTree;
}

describe('TestWatchManager', () => {
    let handler: ReturnType<typeof createMockHandler>;
    let testTree: TestTree;
    let emitter: EventEmitter<Uri>;
    let manager: TestWatchManager;

    beforeEach(() => {
        handler = createMockHandler();
        testTree = createMockTestTree();
        emitter = new EventEmitter<Uri>();
        manager = new TestWatchManager(handler as unknown as TestRunHandler, testTree, emitter);
        manager.setupFileChangeListener();
    });

    it('should catch errors from startTestRun and show error message', async () => {
        const error = new Error('PHPUnit crashed');
        handler.startTestRun.mockRejectedValueOnce(error);

        const cts = new CancellationTokenSource();
        manager.handleContinuousRun(
            new TestRunRequest(undefined, undefined, undefined, true),
            cts.token,
        );

        emitter.fire(Uri.file('/test.php'));

        await vi.waitFor(() => {
            expect(window.showErrorMessage).toHaveBeenCalledWith(
                'PHPUnit: Failed to run continuous tests: PHPUnit crashed',
            );
        });
    });

    it('should serialize concurrent startTestRun calls', async () => {
        let resolveFirst!: () => void;
        const firstRun = new Promise<void>((r) => (resolveFirst = r));
        handler.startTestRun.mockReturnValueOnce(firstRun).mockResolvedValueOnce(undefined);

        const cts = new CancellationTokenSource();
        manager.handleContinuousRun(
            new TestRunRequest(undefined, undefined, undefined, true),
            cts.token,
        );

        const uri = Uri.file('/test.php');
        emitter.fire(uri);

        await vi.waitFor(() => {
            expect(handler.startTestRun).toHaveBeenCalledTimes(1);
        });

        emitter.fire(uri);

        expect(handler.startTestRun).toHaveBeenCalledTimes(1);

        resolveFirst();

        await vi.waitFor(() => {
            expect(handler.startTestRun).toHaveBeenCalledTimes(2);
        });
    });
});
