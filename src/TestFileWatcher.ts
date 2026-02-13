import { Disposable, EventEmitter, ExtensionContext, Uri, workspace } from 'vscode';
import { TestFileDiscovery } from './TestFileDiscovery';
import { TestCollection } from './TestCollection';

export class TestFileWatcher {
    constructor(
        private testFileDiscovery: TestFileDiscovery,
        private testCollection: TestCollection,
        private fileChangedEmitter: EventEmitter<Uri>,
    ) {}

    registerDocumentListeners(context: ExtensionContext): void {
        context.subscriptions.push(
            workspace.onDidOpenTextDocument((document) =>
                this.testCollection.add(document.uri),
            ),
            workspace.onDidChangeTextDocument((e) =>
                this.testCollection.change(e.document.uri),
            ),
        );
    }

    async startWatching(): Promise<Disposable[]> {
        return Promise.all(
            (await this.testFileDiscovery.getWorkspaceTestPatterns()).map(
                async ({ pattern, exclude }) => {
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
                },
            ),
        );
    }
}
