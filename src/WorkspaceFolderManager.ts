import { type Container, inject, injectable } from 'inversify';
import {
    type Disposable,
    type Event,
    type EventEmitter,
    type ExtensionContext,
    type TestController,
    type TestItem,
    type Uri,
    EventEmitter as VscodeEventEmitter,
    type WorkspaceFolder,
    window,
    workspace,
} from 'vscode';
import { TestType } from './PHPUnit';
import { TestCollection } from './TestCollection';
import { icon } from './TestCollection/TestHierarchyBuilder';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import { TestRunHandler } from './TestExecution';
import type { ChildContainerFactory, FolderTestContext } from './types';
import { TYPES } from './types';

@injectable()
export class WorkspaceFolderManager {
    readonly onDidReload: Event<void>;
    private folders = new Map<string, Container>();
    private activeWatchers: Disposable[] = [];
    private pendingOperation = Promise.resolve();
    private readonly _onDidReload = new VscodeEventEmitter<void>();

    constructor(
        @inject(TYPES.ChildContainerFactory) private createChildContainer: ChildContainerFactory,
        @inject(TYPES.TestController) private ctrl: TestController,
    ) {
        this.onDidReload = this._onDidReload.event;
    }

    getByKey(key: string): Container | undefined {
        return this.folders.get(key);
    }

    getAll(): Container[] {
        return [...this.folders.values()];
    }

    async initialize(context: ExtensionContext): Promise<void> {
        for (const folder of workspace.workspaceFolders ?? []) {
            this.add(folder);
        }

        await Promise.all(
            this.getAll().map((child) => child.get(TestFileDiscovery).loadWorkspaceConfiguration()),
        );

        this.applyFolderRoots();
        await this.addOpenDocuments();
        this.registerDocumentListeners(context);
        this.setupFileChangeListeners();
        this.registerFolderChangeListener(context);
    }

    setupControllerHandlers(context: ExtensionContext): void {
        this.ctrl.refreshHandler = () => this.reloadAll();

        this.ctrl.resolveHandler = async (item) => {
            if (!item) {
                this.pendingOperation = this.pendingOperation.then(async () => {
                    for (const watcher of this.activeWatchers) {
                        watcher.dispose();
                    }
                    this.activeWatchers = [];

                    await this.doReloadAll();

                    const watchers = await Promise.all(
                        this.getAll().map((c) => c.get(TestFileWatcher).startWatching()),
                    );
                    this.activeWatchers = watchers;
                    context.subscriptions.push(...watchers);
                });
                await this.pendingOperation;
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

    async reloadAll(): Promise<void> {
        this.pendingOperation = this.pendingOperation.then(() => this.doReloadAll());
        await this.pendingOperation;
    }

    findAllGroups(): string[] {
        return [
            ...new Set(this.getAll().flatMap((c) => c.get(TestCollection).findGroups())),
        ].sort();
    }

    findTestsByGroup(group: string): TestItem[] {
        return this.getAll().flatMap((c) => c.get(TestCollection).findTestsByGroup(group));
    }

    findMostRecentRun(): FolderTestContext | undefined {
        let mostRecent: FolderTestContext | undefined;
        let mostRecentTime = -1;

        for (const child of this.getAll()) {
            const runHandler = child.get(TestRunHandler);
            if (runHandler.getPreviousRequest() && runHandler.getLastRunAt() > mostRecentTime) {
                mostRecentTime = runHandler.getLastRunAt();
                mostRecent = this.toContext(child);
            }
        }

        return mostRecent;
    }

    dispose(): void {
        for (const container of this.folders.values()) {
            this.cleanupContainer(container);
        }
        this.folders.clear();
        this.ctrl.items.replace([]);
        for (const watcher of this.activeWatchers) {
            watcher.dispose();
        }
        this.activeWatchers = [];
        this._onDidReload.dispose();
    }

    [Symbol.iterator]() {
        return this.folders.values();
    }

    private add(folder: WorkspaceFolder): Container {
        const key = folder.uri.toString();
        const existing = this.folders.get(key);
        if (existing) {
            return existing;
        }

        const container = this.createChildContainer(folder);
        this.folders.set(key, container);
        return container;
    }

    private async addOpenDocuments(): Promise<void> {
        await Promise.all(
            workspace.textDocuments.flatMap((document) => {
                const container = this.getByUri(document.uri);
                return container ? [container.get(TestCollection).add(document.uri)] : [];
            }),
        );
    }

    private registerDocumentListeners(context: ExtensionContext): void {
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
    }

    private setupFileChangeListeners(): void {
        for (const child of this.getAll()) {
            child.get(TestWatchManager).setupFileChangeListener();
        }
    }

    private registerFolderChangeListener(context: ExtensionContext): void {
        context.subscriptions.push(
            workspace.onDidChangeWorkspaceFolders((event) => {
                this.pendingOperation = this.pendingOperation
                    .then(async () => {
                        const { needsReload, addedContainers } = this.handleFolderChange(event);

                        if (needsReload) {
                            await this.doReloadAll();
                            return;
                        }

                        for (const child of addedContainers) {
                            await child.get(TestFileDiscovery).loadWorkspaceConfiguration();
                            await child.get(TestFileDiscovery).reloadAll();
                            const watcher = await child.get(TestFileWatcher).startWatching();
                            context.subscriptions.push(watcher);
                        }
                        this._onDidReload.fire();
                    })
                    .catch((err) => {
                        const message = err instanceof Error ? err.message : String(err);
                        window.showErrorMessage(
                            `PHPUnit: Failed to handle folder change: ${message}`,
                        );
                    });
            }),
        );
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

    private handleFolderChange(event: {
        added: readonly WorkspaceFolder[];
        removed: readonly WorkspaceFolder[];
    }): { needsReload: boolean; addedContainers: Container[] } {
        const prevCount = this.getAll().length;

        for (const folder of event.added) {
            this.add(folder);
        }
        for (const folder of event.removed) {
            this.remove(folder);
        }

        const newCount = this.getAll().length;
        const wasMulti = prevCount > 1;
        const isMulti = newCount > 1;
        const crossedBoundary = wasMulti !== isMulti;

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

    private async doReloadAll(): Promise<void> {
        await Promise.all(this.getAll().map((c) => c.get(TestFileDiscovery).reloadAll()));
        this._onDidReload.fire();
    }

    private cleanupContainer(container: Container): void {
        container.get(TestCollection).reset();
        container.get<EventEmitter<Uri>>(TYPES.FileChangedEmitter).dispose();
    }

    private toContext(container: Container): FolderTestContext {
        return {
            findTestsByFile: (uri) => container.get(TestCollection).findTestsByFile(uri),
            findTestsByPosition: (uri, pos) =>
                container.get(TestCollection).findTestsByPosition(uri, pos),
            findTestsByRequest: (req) => container.get(TestCollection).findTestsByRequest(req),
            getPreviousRequest: () => container.get(TestRunHandler).getPreviousRequest(),
            getLastRunAt: () => container.get(TestRunHandler).getLastRunAt(),
        };
    }

    private createFolderRoot(child: Container): void {
        const folder = child.get<WorkspaceFolder>(TYPES.WorkspaceFolder);
        const folderItem = this.ctrl.createTestItem(
            `folder:${folder.uri.toString()}`,
            `${icon(TestType.workspace)} ${folder.name}`,
            folder.uri,
        );
        folderItem.sortText = String(folder.index).padStart(5, '0');
        folderItem.canResolveChildren = true;
        this.ctrl.items.add(folderItem);

        const testCollection = child.get(TestCollection);
        testCollection.setRootItems(folderItem.children);
        testCollection.registerTestDefinition(folderItem, {
            type: TestType.workspace,
            id: `folder:${folder.uri.toString()}`,
            label: folder.name,
        });
    }
}
