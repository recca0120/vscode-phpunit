import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter, RelativePattern, type Uri, type WorkspaceFolder, workspace } from 'vscode';
import type { TestCollection } from '../TestCollection';
import type { TestFileDiscovery } from './TestFileDiscovery';
import { TestFileWatcher } from './TestFileWatcher';

const workspaceFolder = { uri: { fsPath: '/workspace' } } as WorkspaceFolder;

function createMockDiscovery(
    configFilePattern = '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.lock}',
) {
    return {
        getWorkspaceTestPattern: vi.fn().mockResolvedValue({
            workspaceFolder,
            pattern: new RelativePattern('/workspace', '**/*.php'),
            exclude: new RelativePattern('/workspace', 'vendor/**'),
        }),
        getConfigFilePattern: vi.fn().mockReturnValue(configFilePattern),
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

    beforeEach(() => {
        discovery = createMockDiscovery();
        collection = createMockCollection();
        emitter = new EventEmitter<Uri>();
        fileWatcher = new TestFileWatcher(discovery, collection, emitter);
    });

    const getTestWatcher = () => vi.mocked(workspace.createFileSystemWatcher).mock.results[0].value;
    const getConfigWatcher = () =>
        vi.mocked(workspace.createFileSystemWatcher).mock.results[1].value;

    describe('test file watching', () => {
        it('should add to collection and fire emitter on create', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            await vi.mocked(getTestWatcher().onDidCreate).mock.calls[0][0](uri);

            expect(collection.add).toHaveBeenCalledWith(uri);
            expect(emitter.event).toBeDefined();
        });

        it('should update collection and fire emitter on change', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            await vi.mocked(getTestWatcher().onDidChange).mock.calls[0][0](uri);

            expect(collection.change).toHaveBeenCalledWith(uri);
        });

        it('should delete from collection on delete', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/tests/FooTest.php' } as Uri;

            vi.mocked(getTestWatcher().onDidDelete).mock.calls[0][0](uri);

            expect(collection.delete).toHaveBeenCalledWith(uri);
        });
    });

    describe('config file watching', () => {
        it('should create a second watcher for config files', async () => {
            await fileWatcher.startWatching();

            expect(workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2);
        });

        it('should reload all tests when phpunit.xml changes', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(getConfigWatcher().onDidChange).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when composer.lock changes', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/composer.lock' } as Uri;

            await vi.mocked(getConfigWatcher().onDidChange).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is created', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(getConfigWatcher().onDidCreate).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is deleted', async () => {
            await fileWatcher.startWatching();
            const uri = { toString: () => 'file:///workspace/phpunit.xml' } as Uri;

            await vi.mocked(getConfigWatcher().onDidDelete).mock.calls[0][0](uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('uses pattern from getConfigFilePattern for the config watcher', async () => {
            discovery = createMockDiscovery('{custom.xml,composer.lock}');
            fileWatcher = new TestFileWatcher(discovery, collection, emitter);

            await fileWatcher.startWatching();

            const configWatcherArg = vi.mocked(workspace.createFileSystemWatcher).mock
                .calls[1][0] as RelativePattern;
            expect(configWatcherArg.pattern).toBe('{custom.xml,composer.lock}');
        });

        it('uses fallback pattern when getConfigFilePattern returns default', async () => {
            await fileWatcher.startWatching();

            const configWatcherArg = vi.mocked(workspace.createFileSystemWatcher).mock
                .calls[1][0] as RelativePattern;
            expect(configWatcherArg.pattern).toBe(
                '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.lock}',
            );
        });
    });
});
