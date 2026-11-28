import type { TestItem } from 'vscode';

export const busyChangesOf = (item: TestItem) =>
    (item as unknown as { busyChanges: boolean[] }).busyChanges;
