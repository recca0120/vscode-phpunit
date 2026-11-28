import { vi } from 'vitest';
import type {
    TestRunRequest as BaseTestRunRequest,
    CancellationToken,
    TestController,
    TestItem,
    TestItemCollection,
    TestTag,
} from 'vscode';
import type { URI } from 'vscode-uri';
import type { TestRunProfileKind } from './types';

class FakeTestItemCollection implements Iterable<[id: string, testItem: TestItem]> {
    private items = new Map<string, TestItem>();
    private readonly parent: any;

    constructor(parent: any = undefined) {
        this.parent = parent === undefined ? undefined : parent;
    }

    get size() {
        return this.items.size;
    }

    add(item: TestItem) {
        if (this.parent) {
            item = Object.defineProperty(item, 'parent', { value: this.parent });
        }
        this.items.set(item.id, item);
    }

    get(itemId: string) {
        return this.items.get(itemId);
    }

    delete(itemId: string) {
        return this.items.delete(itemId);
    }

    replace(items: readonly TestItem[]) {
        this.items.clear();
        for (const item of items) {
            this.add(item);
        }
    }

    forEach(
        callback: (item: TestItem, collection: TestItemCollection) => unknown,
        _thisArg?: any,
    ): void {
        const sorted = [...this.items.values()].sort((a, b) =>
            (a.sortText || a.label).localeCompare(b.sortText || b.label),
        );
        for (const item of sorted) {
            callback(item, Object.assign(this) as TestItemCollection);
        }
    }

    [Symbol.iterator](): Iterator<[id: string, testItem: TestItem]> {
        const sorted = [...this.items.entries()].sort(([, a], [, b]) =>
            (a.sortText || a.label).localeCompare(b.sortText || b.label),
        );
        return sorted[Symbol.iterator]();
    }
}

const createTestItem = vi
    .fn()
    .mockImplementation((id: string, label: string, uri?: URI): TestItem => {
        const testItem = { id, label, uri } as any;
        testItem.children = new FakeTestItemCollection(testItem);
        const busyChanges: boolean[] = [];
        Object.defineProperty(testItem, 'busyChanges', { value: busyChanges });
        Object.defineProperty(testItem, 'busy', {
            get: () => busyChanges[busyChanges.length - 1] ?? false,
            set: (busy: boolean) => busyChanges.push(busy),
        });

        return testItem;
    });

const createRunProfile = vi
    .fn()
    .mockImplementation(
        (
            label: string,
            kind: TestRunProfileKind,
            runHandler: (
                request: BaseTestRunRequest,
                token: CancellationToken,
            ) => Thenable<void> | void,
            isDefault?: boolean,
            tag?: TestTag,
        ) => ({ label, kind, isDefault, tag, runHandler }),
    );

const createTestRun = vi
    .fn()
    .mockImplementation((_request: BaseTestRunRequest, name?: string, persist?: boolean) => {
        return {
            name: name,
            isPersisted: !!persist,
            enqueued: vi.fn(),
            started: vi.fn(),
            skipped: vi.fn(),
            failed: vi.fn(),
            errored: vi.fn(),
            passed: vi.fn(),
            appendOutput: vi.fn(),
            end: vi.fn(),
            addCoverage: vi.fn(),
        };
    });

const createTestController = vi
    .fn()
    .mockImplementation((id: string, label: string): TestController => {
        const testController = {
            id,
            label,
            createRunProfile,
            createTestItem,
            createTestRun,
            invalidated: [] as string[],
            invalidateTestResults(items: readonly TestItem[]) {
                const withChildren = (item: TestItem): string[] => [
                    item.id,
                    ...[...item.children].flatMap(([, child]) => withChildren(child)),
                ];
                testController.invalidated.push(...items.flatMap(withChildren));
            },
        } as any;
        testController.items = new FakeTestItemCollection();

        return testController;
    });

const tests = { createTestController };

export { tests };
