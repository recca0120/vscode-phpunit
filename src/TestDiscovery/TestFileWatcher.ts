import { inject, injectable } from 'inversify';
import {
    type Disposable,
    type EventEmitter,
    type Uri,
    workspace,
} from 'vscode';
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
        const { pattern, exclude } = await this.testFileDiscovery.getWorkspaceTestPattern();
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

        await this.testFileDiscovery.discoverTestFiles(pattern, exclude);

        return watcher;
    }
}
