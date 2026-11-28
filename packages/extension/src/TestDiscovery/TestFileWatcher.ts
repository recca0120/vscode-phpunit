import { inject, injectable } from 'inversify';
import { type Disposable, type EventEmitter, type Uri, workspace } from 'vscode';
import { TestTree } from '../TestTree';
import { TYPES } from '../types';
import { TestFileDiscovery } from './TestFileDiscovery';

const CONFIGURATION_SETTLE_MS = 500;

@injectable()
export class TestFileWatcher {
    private testWatcher?: Disposable;
    private configWatcher?: Disposable;
    private reloadTimer?: ReturnType<typeof setTimeout>;

    constructor(
        @inject(TestFileDiscovery) private testFileDiscovery: TestFileDiscovery,
        @inject(TestTree) private testTree: TestTree,
        @inject(TYPES.FileChangedEmitter) private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    async startWatching(): Promise<Disposable> {
        this.dispose();
        await this.createTestWatcher();

        const configWatcher = workspace.createFileSystemWatcher(
            this.testFileDiscovery.getConfigFilePattern(),
        );
        const reload = () => {
            clearTimeout(this.reloadTimer);
            this.reloadTimer = setTimeout(async () => {
                this.reloadTimer = undefined;
                await this.testFileDiscovery.reloadAll();
                await this.createTestWatcher();
            }, CONFIGURATION_SETTLE_MS);
        };
        configWatcher.onDidCreate(reload);
        configWatcher.onDidChange(reload);
        configWatcher.onDidDelete(reload);
        this.configWatcher = configWatcher;

        return { dispose: () => this.dispose() };
    }

    dispose(): void {
        clearTimeout(this.reloadTimer);
        this.reloadTimer = undefined;
        this.testWatcher?.dispose();
        this.testWatcher = undefined;
        this.configWatcher?.dispose();
        this.configWatcher = undefined;
    }

    private async createTestWatcher() {
        this.testWatcher?.dispose();

        const { pattern } = await this.testFileDiscovery.getWorkspaceTestPattern();
        const watcher = workspace.createFileSystemWatcher(pattern);
        const reparse = async (uri: Uri) => {
            await this.testTree.update(uri);
            this.fileChangedEmitter.fire(uri);
        };
        watcher.onDidCreate(reparse);
        watcher.onDidChange(reparse);
        watcher.onDidDelete((uri) => {
            this.testTree.remove(uri);
        });

        this.testWatcher = watcher;
    }
}
