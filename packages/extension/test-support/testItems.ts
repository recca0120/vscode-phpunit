import type { TestItem, TestItemCollection } from 'vscode';

export type TreeNode = { id: string; label: string; children: TreeNode[] };

export const childrenOf = (items: TestItemCollection): TestItem[] =>
    [...items].map(([, item]) => item);

export const collectIds = (items: TestItemCollection): string[] =>
    childrenOf(items).map((item) => item.id);

export const allItems = (items: TestItemCollection): TestItem[] =>
    childrenOf(items).flatMap((item) => [item, ...allItems(item.children)]);

export const allIds = (items: TestItemCollection): string[] =>
    allItems(items).map((item) => item.id);

export const toTree = (items: TestItemCollection): TreeNode[] =>
    childrenOf(items).map((item) => ({
        id: item.id,
        label: item.label,
        children: toTree(item.children),
    }));

export const filesOf = (items: TestItemCollection): string[] => [
    ...new Set(allItems(items).flatMap((item) => (item.uri ? [item.uri.fsPath] : []))),
];
