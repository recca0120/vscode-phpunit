import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancellationTokenSource, EventEmitter, TestRunRequest, Uri, window } from 'vscode';
import type { TestCollection } from '../TestCollection';
import type { TestRunHandler } from '../TestExecution';
import { TestWatchManager } from './TestWatchManager';

function createMockHandler() {
    return { startTestRun: vi.fn().mockResolvedValue(undefined) };
}

function createMockCollection() {
    return { findTestsByFile: vi.fn().mockReturnValue([]) } as unknown as TestCollection;
}

describe('TestWatchManager', () => {
    let handler: ReturnType<typeof createMockHandler>;
    let collection: TestCollection;
    let emitter: EventEmitter<Uri>;
    let manager: TestWatchManager;

    beforeEach(() => {
        handler = createMockHandler();
        collection = createMockCollection();
        emitter = new EventEmitter<Uri>();
        manager = new TestWatchManager(handler as unknown as TestRunHandler, collection, emitter);
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

        // Wait for async error handling
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

        // Wait for first call to be dispatched
        await vi.waitFor(() => {
            expect(handler.startTestRun).toHaveBeenCalledTimes(1);
        });

        // Fire second while first is still pending
        emitter.fire(uri);

        // Still only 1 call because first hasn't resolved
        expect(handler.startTestRun).toHaveBeenCalledTimes(1);

        resolveFirst();

        await vi.waitFor(() => {
            expect(handler.startTestRun).toHaveBeenCalledTimes(2);
        });
    });
});
