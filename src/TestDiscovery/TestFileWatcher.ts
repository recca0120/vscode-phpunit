import { inject, injectable } from 'inversify';
import { type Disposable, type EventEmitter, RelativePattern, type Uri, workspace } from 'vscode';
import { TestCollection } from '../TestCollection';
import { TYPES } from '../types';
import { TestFileDiscovery } from './TestFileDiscovery';

@injectable()
export class TestFileWatcher {
    constructor(
        @inject(TestFileDiscovery) private testFileDiscovery: TestFileDiscovery,
        @inject(TestCollection) private testCollection: TestCollection,
        @inject(TYPES.FileChangedEmitter) private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    async startWatching(): Promise<Disposable> {
        const { workspaceFolder, pattern } = await this.testFileDiscovery.getWorkspaceTestPattern();

        const testWatcher = workspace.createFileSystemWatcher(pattern);
        testWatcher.onDidCreate((uri) => {
            this.testCollection.add(uri);
            this.fileChangedEmitter.fire(uri);
        });
        testWatcher.onDidChange((uri) => {
            this.testCollection.change(uri);
            this.fileChangedEmitter.fire(uri);
        });
        testWatcher.onDidDelete((uri) => {
            this.testCollection.delete(uri);
        });

        const configPattern = this.testFileDiscovery.getConfigFilePattern();
        const configWatcher = workspace.createFileSystemWatcher(
            new RelativePattern(workspaceFolder, configPattern),
        );
        const reload = () => this.testFileDiscovery.reloadAll();
        configWatcher.onDidCreate(reload);
        configWatcher.onDidChange(reload);
        configWatcher.onDidDelete(reload);

        return {
            dispose: () => {
                testWatcher.dispose();
                configWatcher.dispose();
            },
        };
    }
}
