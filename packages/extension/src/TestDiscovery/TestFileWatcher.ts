import { inject, injectable } from 'inversify';
import { type Disposable, type EventEmitter, RelativePattern, type Uri, workspace } from 'vscode';
import { TestTree } from '../TestTree';
import { TYPES } from '../types';
import { TestFileDiscovery } from './TestFileDiscovery';

@injectable()
export class TestFileWatcher {
    private testWatcher?: Disposable;
    private configWatcher?: Disposable;

    constructor(
        @inject(TestFileDiscovery) private testFileDiscovery: TestFileDiscovery,
        @inject(TestTree) private testTree: TestTree,
        @inject(TYPES.FileChangedEmitter) private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    async startWatching(): Promise<Disposable> {
        this.dispose();
        await this.createTestWatcher();

        const { workspaceFolder } = await this.testFileDiscovery.getWorkspaceTestPattern();
        const configPattern = this.testFileDiscovery.getConfigFilePattern();
        const configWatcher = workspace.createFileSystemWatcher(
            new RelativePattern(workspaceFolder, configPattern),
        );
        const reload = async () => {
            await this.testFileDiscovery.reloadAll();
            await this.createTestWatcher();
        };
        configWatcher.onDidCreate(reload);
        configWatcher.onDidChange(reload);
        configWatcher.onDidDelete(reload);
        this.configWatcher = configWatcher;

        return { dispose: () => this.dispose() };
    }

    dispose(): void {
        this.testWatcher?.dispose();
        this.testWatcher = undefined;
        this.configWatcher?.dispose();
        this.configWatcher = undefined;
    }

    private async createTestWatcher() {
        this.testWatcher?.dispose();

        const { pattern } = await this.testFileDiscovery.getWorkspaceTestPattern();
        const watcher = workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(async (uri) => {
            await this.testTree.add(uri);
            this.fileChangedEmitter.fire(uri);
        });
        watcher.onDidChange((uri) => {
            this.testTree.update(uri);
            this.fileChangedEmitter.fire(uri);
        });
        watcher.onDidDelete((uri) => {
            this.testTree.remove(uri);
        });

        this.testWatcher = watcher;
    }
}
