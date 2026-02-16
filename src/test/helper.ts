import * as vscode from 'vscode';

export const EXTENSION_ID = 'recca0120.vscode-phpunit';

export interface ExtensionApi {
    testController: vscode.TestController;
    testRunProfile: vscode.TestRunProfile;
    onDidReload: vscode.Event<void>;
}

export async function activateExtension(): Promise<ExtensionApi> {
    const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID)!;
    if (!ext.isActive) {
        return ext.activate();
    }
    return ext.exports;
}

export function findTestItem(
    items: vscode.TestItemCollection,
    id: string,
): vscode.TestItem | undefined {
    for (const [, item] of items) {
        if (item.id === id) {
            return item;
        }
        const child = findTestItem(item.children, id);
        if (child) {
            return child;
        }
    }
    return undefined;
}

export function countTestItems(items: vscode.TestItemCollection): number {
    let sum = 0;
    items.forEach((item) => (sum += countTestItems(item.children)));
    sum += items.size;
    return sum;
}

export async function waitForTestItems(
    ctrl: vscode.TestController,
    minCount: number,
    timeout = 30_000,
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (countTestItems(ctrl.items) >= minCount) {
            return;
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(
        `Timed out waiting for ${minCount} test items (got ${countTestItems(ctrl.items)})`,
    );
}

export function collectTestItemIds(items: vscode.TestItemCollection): string[] {
    const ids: string[] = [];
    items.forEach((item) => {
        ids.push(item.id);
        ids.push(...collectTestItemIds(item.children));
    });
    return ids;
}
