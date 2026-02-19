import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter, RelativePattern, Uri, type WorkspaceFolder, workspace } from 'vscode';
import type { TestCollection } from '../TestCollection';
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
        mockWorkspace.createdWatchers.length = 0;
        discovery = createMockDiscovery();
        collection = createMockCollection();
        emitter = new EventEmitter<Uri>();
        fileWatcher = new TestFileWatcher(discovery, collection, emitter);
    });

    const getTestWatcher = () => mockWorkspace.createdWatchers[0];
    const getConfigWatcher = () => mockWorkspace.createdWatchers[1];

    describe('test file watching', () => {
        it('should add to collection and fire emitter on create', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/tests/FooTest.php');

            getTestWatcher().fireCreate(uri);

            expect(collection.add).toHaveBeenCalledWith(uri);
            expect(emitter.event).toBeDefined();
        });

        it('should update collection and fire emitter on change', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/tests/FooTest.php');

            getTestWatcher().fireChange(uri);

            expect(collection.change).toHaveBeenCalledWith(uri);
        });

        it('should delete from collection on delete', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/tests/FooTest.php');

            getTestWatcher().fireDelete(uri);

            expect(collection.delete).toHaveBeenCalledWith(uri);
        });
    });

    describe('config file watching', () => {
        it('should create a second watcher for config files', async () => {
            await fileWatcher.startWatching();

            expect(mockWorkspace.createdWatchers).toHaveLength(2);
        });

        it('should reload all tests when phpunit.xml changes', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/phpunit.xml');

            getConfigWatcher().fireChange(uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when composer.lock changes', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/composer.lock');

            getConfigWatcher().fireChange(uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is created', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/phpunit.xml');

            getConfigWatcher().fireCreate(uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('should reload all tests when config file is deleted', async () => {
            await fileWatcher.startWatching();
            const uri = Uri.file('/workspace/phpunit.xml');

            getConfigWatcher().fireDelete(uri);

            expect(discovery.reloadAll).toHaveBeenCalledTimes(1);
        });

        it('uses pattern from getConfigFilePattern for the config watcher', async () => {
            discovery = createMockDiscovery('{custom.xml,composer.lock}');
            fileWatcher = new TestFileWatcher(discovery, collection, emitter);

            await fileWatcher.startWatching();

            expect(getConfigWatcher().pattern.pattern).toBe('{custom.xml,composer.lock}');
        });

        it('uses fallback pattern when getConfigFilePattern returns default', async () => {
            await fileWatcher.startWatching();

            expect(getConfigWatcher().pattern.pattern).toBe(
                '{phpunit.xml,phpunit.xml.dist,phpunit.dist.xml,composer.lock}',
            );
        });
    });
});
