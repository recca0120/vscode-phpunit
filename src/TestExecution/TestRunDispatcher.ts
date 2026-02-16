import { type Container, inject, injectable } from 'inversify';
import {
    type CancellationToken,
    type TestItem,
    TestRunRequest,
    type Uri,
    type WorkspaceFolder,
    workspace,
} from 'vscode';
import { TestWatchManager } from '../TestDiscovery';
import { TYPES } from '../types';
import { WorkspaceFolderManager } from '../WorkspaceFolderManager';
import { TestRunHandler } from './TestRunHandler';

@injectable()
export class TestRunDispatcher {
    constructor(@inject(WorkspaceFolderManager) private folderManager: WorkspaceFolderManager) {}

    async dispatch(request: TestRunRequest, cancellation: CancellationToken): Promise<void> {
        const containers = this.folderManager.getAll();

        if (request.continuous) {
            for (const child of containers) {
                await child.get(TestWatchManager).handleContinuousRun(request, cancellation);
            }
            return;
        }

        if (!request.include) {
            await Promise.all(
                containers.map((child) =>
                    child.get(TestRunHandler).startTestRun(request, cancellation),
                ),
            );
            return;
        }

        const groups = this.groupTestItemsByFolder(request.include);

        await Promise.all(
            [...groups.values()].map(({ container, items }) => {
                const subrequest = new TestRunRequest(items, request.exclude, request.profile);
                return container.get(TestRunHandler).startTestRun(subrequest, cancellation);
            }),
        );
    }

    private groupTestItemsByFolder(
        testItems: readonly TestItem[],
    ): Map<string, { container: Container; items: TestItem[] }> {
        const groups = new Map<string, { container: Container; items: TestItem[] }>();

        for (const testItem of testItems) {
            const uri = this.findTestItemUri(testItem);
            const folder = uri ? workspace.getWorkspaceFolder(uri) : undefined;
            const key = folder?.uri.toString();

            if (!key) {
                this.addToAllContainers(testItem, groups);
                continue;
            }

            if (!groups.has(key)) {
                const container = this.folderManager.getByKey(key);
                if (container) {
                    groups.set(key, { container, items: [] });
                }
            }
            groups.get(key)?.items.push(testItem);
        }

        return groups;
    }

    private addToAllContainers(
        testItem: TestItem,
        groups: Map<string, { container: Container; items: TestItem[] }>,
    ): void {
        for (const child of this.folderManager.getAll()) {
            const childKey = child.get<WorkspaceFolder>(TYPES.WorkspaceFolder).uri.toString();
            if (!groups.has(childKey)) {
                groups.set(childKey, { container: child, items: [] });
            }
            groups.get(childKey)?.items.push(testItem);
        }
    }

    private findTestItemUri(item: TestItem): Uri | undefined {
        if (item.uri) {
            return item.uri;
        }
        for (const [, child] of item.children) {
            const uri = this.findTestItemUri(child);
            if (uri) {
                return uri;
            }
        }
        return undefined;
    }
}
