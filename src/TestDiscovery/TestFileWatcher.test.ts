import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter, RelativePattern, type Uri, workspace } from 'vscode';
import type { TestCollection } from '../TestCollection';
import type { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';

const workspaceFolder = { uri: { fsPath: '/workspace' } } as import('vscode').WorkspaceFolder;

function createMockDiscovery() {
    return {
        getWorkspaceTestPattern: vi.fn().mockResolvedValue({
            workspaceFolder,
            pattern: new RelativePattern('/workspace', '**/*.php'),
            exclude: new RelativePattern('/workspace', 'vendor/**'),
        }),
        reloadAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as TestFileDiscovery;
}

function createMockCollection() {
    return {
        add: vi.fn().mockResolvedValue(undefined),
        change: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
    } as unknown as TestCollection;
}

describe('TestFileWatcher', () => {
    let discovery: TestFileDiscovery;
    let collection: TestCollection;
    let emitter: EventEmitter<Uri>;
    let fileWatcher: TestFileWatcher;

    type MockWatcher = {
        onDidCreate: ReturnType<typeof vi.fn>;
        onDidChange: ReturnType<typeof vi.fn>;
        onDidDelete: ReturnType<typeof vi.fn>;
        dispose: ReturnType<typeof vi.fn>;
    };
    let createdWatchers: MockWatcher[];

    beforeEach(() => {
        createdWatchers = [];
        vi.mocked(workspace.createFileSystemWatcher).mockImplementation(() => {
            const w: MockWatcher = {
                onDidCreate: vi.fn(),
                onDidChange: vi.fn(),
                onDidDelete: vi.fn(),
                dispose: vi.fn(),
            };
            createdWatchers.push(w);
            return w as unknown as import('vscode').FileSystemWatcher;
        });

        discovery = createMockDiscovery();
        collection = createMockCollection();
        emitter = new EventEmitter<Uri>();
        fileWatcher = new TestFileWatcher(discovery, collection, emitter);
    });

    describe('test file watching', () => {
        it('should add to collection and fire emitter on create', async () => {
            await fileWatcher.startWatching();
            const testWatcher = createdWatchers[0];
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            await vi.mocked(testWatcher.onDidCreate).mock.calls[0][0](uri);

            expect(collection.add).toHaveBeenCalledWith(uri);
            expect(emitter.event).toBeDefined();
        });

        it('should update collection and fire emitter on change', async () => {
            await fileWatcher.startWatching();
            const testWatcher = createdWatchers[0];
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            await vi.mocked(testWatcher.onDidChange).mock.calls[0][0](uri);

            expect(collection.change).toHaveBeenCalledWith(uri);
        });

        it('should delete from collection on delete', async () => {
            await fileWatcher.startWatching();
            const testWatcher = createdWatchers[0];
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            vi.mocked(testWatcher.onDidDelete).mock.calls[0][0](uri);

            expect(collection.delete).toHaveBeenCalledWith(uri);
        });
    });

    describe('config file watching', () => {
        it('should create a second watcher for config files', async () => {
            await fileWatcher.startWatching();

            expect(createdWatchers).toHaveLength(2);
        });

        it('should reload all tests when phpunit.xml changes', async () => {
            await fileWatcher.startWatching();
            const configWatcher = createdWatchers[1];
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(configWatcher.onDidChange).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when phpunit.xml.dist changes', async () => {
            await fileWatcher.startWatching();
            const configWatcher = createdWatchers[1];
            const uri = { toString: () => 'file:///workspace/phpunit.xml.dist' } as Uri;

            await vi.mocked(configWatcher.onDidChange).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when composer.lock changes', async () => {
            await fileWatcher.startWatching();
            const configWatcher = createdWatchers[1];
            const uri = { toString: () => 'file:///workspace/composer.lock' } as Uri;

            await vi.mocked(configWatcher.onDidChange).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is created', async () => {
            await fileWatcher.startWatching();
            const configWatcher = createdWatchers[1];
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(configWatcher.onDidCreate).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is deleted', async () => {
            await fileWatcher.startWatching();
            const configWatcher = createdWatchers[1];
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(configWatcher.onDidDelete).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });
    });
});
