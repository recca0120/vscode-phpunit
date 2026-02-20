import { inject, injectable } from 'inversify';
import { type Disposable, type EventEmitter, RelativePattern, type Uri, workspace } from 'vscode';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';
import { TestFileDiscovery } from './TestFileDiscovery';

@injectable()
export class TestFileWatcher {
    private testWatcher?: Disposable;

    constructor(
        @inject(TestFileDiscovery) private testFileDiscovery: TestFileDiscovery,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.FileChangedEmitter) private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    async startWatching(): Promise<Disposable> {
        this.createTestWatcher();

        const { workspaceFolder } = await this.testFileDiscovery.getWorkspaceTestPattern();
        const configPattern = this.testFileDiscovery.getConfigFilePattern();
        const configWatcher = workspace.createFileSystemWatcher(
            new RelativePattern(workspaceFolder, configPattern),
        );
        const reload = async () => {
            await this.testFileDiscovery.reloadAll();
            this.createTestWatcher();
        };
        configWatcher.onDidCreate(reload);
        configWatcher.onDidChange(reload);
        configWatcher.onDidDelete(reload);

        return {
            dispose: () => {
                this.testWatcher?.dispose();
                configWatcher.dispose();
            },
        };
    }

    private async createTestWatcher() {
        this.testWatcher?.dispose();

        const { pattern } = await this.testFileDiscovery.getWorkspaceTestPattern();
        const watcher = workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate((uri) => {
            this.testCollection.add(uri);
            this.fileChangedEmitter.fire(uri);
        });
        watcher.onDidChange((uri) => {
            this.testCollection.change(uri);
            this.fileChangedEmitter.fire(uri);
        });
        watcher.onDidDelete((uri) => {
            this.testCollection.delete(uri);
        });

        this.testWatcher = watcher;
    }
}
