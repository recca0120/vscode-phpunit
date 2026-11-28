import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { EventEmitter, RelativePattern, Uri, type WorkspaceFolder, workspace } from 'vscode';
import type { TestTree } from '../TestTree';
import type { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';

type FakeFileSystemWatcher = {
    fireCreate(uri: Uri): void;
    fireChange(uri: Uri): void;
    fireDelete(uri: Uri): void;
    disposed: boolean;
    pattern: { pattern: string };
};

type MockWorkspace = { createdWatchers: FakeFileSystemWatcher[] };
const mockWorkspace = workspace as unknown as MockWorkspace;

const workspaceFolder = { uri: { fsPath: '/workspace' } } as WorkspaceFolder;

function createMockDiscovery(
    configFilePattern = '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.json,composer.lock}',
) {
    return {
        getWorkspaceTestPattern: vi.fn().mockResolvedValue({
            workspaceFolder,
            pattern: new RelativePattern('/workspace', '**/*.php'),
            exclude: new RelativePattern('/workspace', 'vendor/**'),
        }),
        getConfigFilePattern: vi
            .fn()
            .mockReturnValue(new RelativePattern('/workspace', configFilePattern)),
        reloadAll: vi.fn().mockResolvedValue(undefined),
    } satisfies Partial<TestFileDiscovery> as unknown as TestFileDiscovery;
}

function createMockTestTree() {
    return {
        add: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn(),
    } satisfies Partial<TestTree> as unknown as TestTree;
}

describe('TestFileWatcher', () => {
    let discovery: TestFileDiscovery;
    let testTree: TestTree;
    let emitter: EventEmitter<Uri>;
    let fileWatcher: TestFileWatcher;

    beforeEach(() => {
        mockWorkspace.createdWatchers.length = 0;
        discovery = createMockDiscovery();
        testTree = createMockTestTree();
        emitter = new EventEmitter<Uri>();
        fileWatcher = new TestFileWatcher(discovery, testTree, emitter);
    });

    const getConfigWatcher = () => mockWorkspace.createdWatchers[1];

    describe('config file watching', () => {
        it('should reload all tests when composer.lock changes', async () => {
            vi.useFakeTimers();
            onTestFinished(() => {
                vi.useRealTimers();
            });
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/composer.lock');

            getConfigWatcher().fireChange(uri);
            vi.advanceTimersByTime(500);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });
    });

    describe('lifecycle', () => {
        it('startWatching again disposes the previous watchers', async () => {
            await fileWatcher.startWatching();
            const previous = [...mockWorkspace.createdWatchers];

            await fileWatcher.startWatching();

            expect(previous.every((w) => w.disposed)).toBe(true);
            expect(mockWorkspace.createdWatchers.slice(2).some((w) => w.disposed)).toBe(false);
        });
    });
});
