import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter, type TestItem, type TestRunProfile, type Uri, window } from 'vscode';
import { TestCollection } from '../TestCollection';
import { TestRunHandler } from '../TestExecution';
import { TestWatchManager } from './TestWatchManager';

function createMockHandler() {
    return { startTestRun: vi.fn().mockResolvedValue(undefined) } as unknown as TestRunHandler;
}

function createMockCollection() {
    return { findTestsByFile: vi.fn().mockReturnValue([]) } as unknown as TestCollection;
}

function createTestItem(uri: Uri): TestItem {
    return { id: 'test1', uri, children: { size: 0 } } as any;
}

describe('TestWatchManager', () => {
    let handler: TestRunHandler;
    let collection: TestCollection;
    let emitter: EventEmitter<Uri>;
    let manager: TestWatchManager;

    beforeEach(() => {
        handler = createMockHandler();
        collection = createMockCollection();
        emitter = new EventEmitter<Uri>();
        manager = new TestWatchManager(handler, collection, emitter);
        manager.setupFileChangeListener();
    });

    it('should catch errors from startTestRun and show error message', async () => {
        const error = new Error('PHPUnit crashed');
        vi.mocked(handler.startTestRun).mockRejectedValueOnce(error);

        manager.handleContinuousRun(
            { include: undefined, continuous: true } as any,
            { isCancellationRequested: false, onCancellationRequested: vi.fn() } as any,
        );

        emitter.fire({ toString: () => 'file:///test.php' } as Uri);

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
        vi.mocked(handler.startTestRun)
            .mockReturnValueOnce(firstRun)
            .mockResolvedValueOnce(undefined);

        manager.handleContinuousRun(
            { include: undefined, continuous: true } as any,
            { isCancellationRequested: false, onCancellationRequested: vi.fn() } as any,
        );

        const uri = { toString: () => 'file:///test.php' } as Uri;
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
