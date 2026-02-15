import { inject, injectable, type Container } from 'inversify';
import {
    type EventEmitter,
    type ExtensionContext,
    type TestController,
    type Uri,
    type WorkspaceFolder,
    workspace,
} from 'vscode';
import { TestCollection } from './TestCollection';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import { TestRunHandler } from './TestExecution';
import type { ChildContainerFactory, FolderTestContext } from './types';
import { TYPES } from './types';

@injectable()
export class WorkspaceFolderManager {
    private folders = new Map<string, Container>();

    constructor(
        @inject(TYPES.ChildContainerFactory) private createChildContainer: ChildContainerFactory,
        @inject(TYPES.TestController) private ctrl: TestController,
    ) {}

    private add(folder: WorkspaceFolder): Container {
        const key = folder.uri.toString();
        if (!this.folders.has(key)) {
            this.folders.set(key, this.createChildContainer(folder));
        }
        return this.folders.get(key)!;
    }

    private remove(folder: WorkspaceFolder): void {
        const key = folder.uri.toString();
        const container = this.folders.get(key);
        if (container) {
            this.cleanupContainer(container);
        }
        this.ctrl.items.delete(`folder:${key}`);
        this.folders.delete(key);
    }

    private getByUri(uri: Uri): Container | undefined {
        const folder = workspace.getWorkspaceFolder(uri);
        return folder ? this.folders.get(folder.uri.toString()) : undefined;
    }

    getByKey(key: string): Container | undefined {
        return this.folders.get(key);
    }

    getAll(): Container[] {
        return [...this.folders.values()];
    }

    private applyFolderRoots(): void {
        const containers = this.getAll();
        const isMulti = containers.length > 1;

        for (const child of containers) {
            child.get(TestCollection).setRootItems(undefined);
        }

        this.ctrl.items.replace([]);

        if (isMulti) {
            for (const child of containers) {
                this.createFolderRoot(child);
            }
        }
    }

    private handleFolderChange(
        event: { added: readonly WorkspaceFolder[]; removed: readonly WorkspaceFolder[] },
    ): { needsReload: boolean; addedContainers: Container[] } {
        const prevCount = this.getAll().length;

        for (const folder of event.added) {
            this.add(folder);
        }
        for (const folder of event.removed) {
            this.remove(folder);
        }

        const newCount = this.getAll().length;
        const crossedBoundary = (prevCount <= 1) !== (newCount <= 1);

        if (crossedBoundary) {
            this.applyFolderRoots();
            return { needsReload: true, addedContainers: [] };
        }

        const addedContainers: Container[] = [];
        for (const folder of event.added) {
            const child = this.getByKey(folder.uri.toString());
            if (child) {
                if (newCount > 1) {
                    this.createFolderRoot(child);
                }
                addedContainers.push(child);
            }
        }

        return { needsReload: false, addedContainers };
    }

    async initialize(context: ExtensionContext): Promise<void> {
        // Add all workspace folders
        for (const folder of workspace.workspaceFolders ?? []) {
            this.add(folder);
        }

        // Load workspace configuration for each folder
        await Promise.all(
            this.getAll().map((child) => child.get(TestFileDiscovery).loadWorkspaceConfiguration()),
        );

        // Create folder root items for multi-workspace
        this.applyFolderRoots();

        // Add open documents to their respective collections
        await Promise.all(
            workspace.textDocuments.flatMap((document) => {
                const container = this.getByUri(document.uri);
                return container ? [container.get(TestCollection).add(document.uri)] : [];
            }),
        );

        // Register document change listeners
        context.subscriptions.push(
            workspace.onDidOpenTextDocument((document) => {
                const container = this.getByUri(document.uri);
                if (container) {
                    container.get(TestCollection).add(document.uri);
                }
            }),
            workspace.onDidChangeTextDocument((e) => {
                const container = this.getByUri(e.document.uri);
                if (container) {
                    container.get(TestCollection).change(e.document.uri);
                }
            }),
        );

        // Setup file change listeners for all folders
        for (const child of this.getAll()) {
            child.get(TestWatchManager).setupFileChangeListener();
        }

        // Watch for folder changes
        context.subscriptions.push(
            workspace.onDidChangeWorkspaceFolders((event) => {
                const { needsReload, addedContainers } = this.handleFolderChange(event);

                if (needsReload) {
                    Promise.all(
                        this.getAll().map((c) => c.get(TestFileDiscovery).reloadAll()),
                    ).catch((err) => console.error('Failed to reload after folder change:', err));
                }

                for (const child of addedContainers) {
                    child.get(TestFileDiscovery).loadWorkspaceConfiguration().then(() =>
                        child.get(TestFileWatcher).startWatching().then((watcher) => {
                            context.subscriptions.push(watcher);
                        }),
                    ).catch((err) => console.error('Failed to initialize folder:', err));
                }
            }),
        );
    }

    setupControllerHandlers(context: ExtensionContext): void {
        this.ctrl.refreshHandler = async () => {
            await Promise.all(this.getAll().map((c) => c.get(TestFileDiscovery).reloadAll()));
        };

        this.ctrl.resolveHandler = async (item) => {
            if (!item) {
                const watchers = await Promise.all(
                    this.getAll().map((c) => c.get(TestFileWatcher).startWatching()),
                );
                context.subscriptions.push(...watchers);
                return;
            }

            if (item.uri) {
                const container = this.getByUri(item.uri);
                if (container) {
                    await container.get(TestCollection).add(item.uri);
                }
            }
        };
    }

    getContextForUri(uri: Uri): FolderTestContext | undefined {
        const container = this.getByUri(uri);
        return container ? this.toContext(container) : undefined;
    }

    getAllContexts(): FolderTestContext[] {
        return this.getAll().map((c) => this.toContext(c));
    }

    dispose(): void {
        for (const container of this.folders.values()) {
            this.cleanupContainer(container);
        }
        this.folders.clear();
    }

    [Symbol.iterator]() {
        return this.folders.values();
    }

    private cleanupContainer(container: Container): void {
        container.get(TestCollection).reset();
        container.get<EventEmitter<Uri>>(TYPES.FileChangedEmitter).dispose();
    }

    private toContext(container: Container): FolderTestContext {
        return {
            reloadAll: () => container.get(TestFileDiscovery).reloadAll(),
            findTestsByFile: (uri) => container.get(TestCollection).findTestsByFile(uri),
            findTestsByPosition: (uri, pos) => container.get(TestCollection).findTestsByPosition(uri, pos),
            findTestsByRequest: (req) => container.get(TestCollection).findTestsByRequest(req),
            getPreviousRequest: () => container.get(TestRunHandler).getPreviousRequest(),
            getLastRunAt: () => container.get(TestRunHandler).getLastRunAt(),
        };
    }

    private createFolderRoot(child: Container): void {
        const folder = child.get<WorkspaceFolder>(TYPES.WorkspaceFolder);
        const folderItem = this.ctrl.createTestItem(
            `folder:${folder.uri.toString()}`,
            `$(folder) ${folder.name}`,
        );
        folderItem.canResolveChildren = true;
        this.ctrl.items.add(folderItem);
        child.get(TestCollection).setRootItems(folderItem.children);
    }

}
