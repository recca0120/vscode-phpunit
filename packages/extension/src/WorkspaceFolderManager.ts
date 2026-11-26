import { type Container, inject, injectable } from 'inversify';
import {
    type Disposable,
    type Event,
    type EventEmitter,
    type TestController,
    type Uri,
    EventEmitter as VscodeEventEmitter,
    type WorkspaceFolder,
    window,
    workspace,
} from 'vscode';
import { TestFileDiscovery, TestFileWatcher, TestWatchManager } from './TestDiscovery';
import { TestTree } from './TestTree';
import type { ChildContainerFactory } from './types';
import { TYPES } from './types';

@injectable()
export class WorkspaceFolderManager {
    readonly onDidReload: Event<void>;
    private folders = new Map<string, Container>();
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

    getByUri(uri: Uri): Container | undefined {
        const folder = workspace.getWorkspaceFolder(uri);
        return folder ? this.folders.get(folder.uri.toString()) : undefined;
    }

    getAll(): Container[] {
        return [...this.folders.values()];
    }

    async initialize(): Promise<void> {
        for (const folder of workspace.workspaceFolders ?? []) {
            this.add(folder);
        }

        await Promise.all(
            this.getAll().map((child) => child.get(TestFileDiscovery).loadWorkspaceConfiguration()),
        );

        this.applyFolderRoots();
        this.setupFileChangeListeners();
    }

    enqueue(fn: () => Promise<void>): Promise<void> {
        return this.runExclusive(fn);
    }

    async reload(): Promise<void> {
        await this.reloadContainers();
        this._onDidReload.fire();
    }

    reloadAll(): Promise<void> {
        return this.runExclusive(() => this.reload());
    }

    registerFolderChangeListener(): Disposable {
        return workspace.onDidChangeWorkspaceFolders((event) => {
            this.runExclusive(async () => {
                const { needsReload, addedContainers } = this.handleFolderChange(event);

                if (needsReload) {
                    await this.reloadContainers();
                } else {
                    for (const child of addedContainers) {
                        await child.get(TestFileDiscovery).loadWorkspaceConfiguration();
                        await child.get(TestFileDiscovery).reloadAll();
                    }
                }

                for (const child of addedContainers) {
                    await this.startWatchingFolder(child);
                }
                this._onDidReload.fire();
            }).catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                window.showErrorMessage(`PHPUnit: Failed to handle folder change: ${message}`);
            });
        });
    }

    dispose(): void {
        for (const container of this.folders.values()) {
            this.cleanupContainer(container);
        }
        this.folders.clear();
        this.ctrl.items.replace([]);
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

    private runExclusive(fn: () => Promise<void>): Promise<void> {
        const operation = this.pendingOperation.then(fn);
        this.pendingOperation = operation.catch(() => {});
        return operation;
    }

    private async reloadContainers(): Promise<void> {
        await Promise.all(this.getAll().map((c) => c.get(TestFileDiscovery).reloadAll()));
    }

    private async startWatchingFolder(child: Container): Promise<void> {
        await child.get(TestFileWatcher).startWatching();
        child.get(TestWatchManager).setupFileChangeListener();
    }

    private setupFileChangeListeners(): void {
        for (const child of this.getAll()) {
            child.get(TestWatchManager).setupFileChangeListener();
        }
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

    private applyFolderRoots(): void {
        const containers = this.getAll();
        const isMulti = containers.length > 1;

        for (const child of containers) {
            child.get(TestTree).setRootItems(undefined);
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
        const addedContainers = event.added.flatMap((folder) => {
            const child = this.getByKey(folder.uri.toString());
            return child ? [child] : [];
        });

        if (crossedBoundary) {
            this.applyFolderRoots();
            return { needsReload: true, addedContainers };
        }

        if (isMulti) {
            for (const child of addedContainers) {
                this.createFolderRoot(child);
            }
        }

        return { needsReload: false, addedContainers };
    }

    private cleanupContainer(container: Container): void {
        container.get(TestFileWatcher).dispose();
        container.get(TestTree).clear();
        container.get<EventEmitter<Uri>>(TYPES.FileChangedEmitter).dispose();
    }

    private createFolderRoot(child: Container): void {
        const folder = child.get<WorkspaceFolder>(TYPES.WorkspaceFolder);
        const folderItem = child.get(TestTree).createFolderRoot(folder);
        this.ctrl.items.add(folderItem);
    }
}
