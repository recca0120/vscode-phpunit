import type { TestItem } from 'vscode';
import { TestType, type TestDefinition } from '../PHPUnit';

export class TestDefinitionIndex {
    private definitions = new Map<string, TestDefinition>();
    private items = new Map<string, TestItem>();
    private groups = new Map<string, Set<TestItem>>();
    private byUri = new Map<string, Set<string>>();

    set(uri: string, testItem: TestItem, testDefinition: TestDefinition): void {
        this.definitions.set(testItem.id, testDefinition);
        this.items.set(testItem.id, testItem);

        if (!this.byUri.has(uri)) {
            this.byUri.set(uri, new Set());
        }
        this.byUri.get(uri)!.add(testItem.id);

        if (testDefinition.type === TestType.method) {
            for (const tag of testItem.tags ?? []) {
                if (tag.id.startsWith('group:')) {
                    const group = tag.id.slice(6);
                    if (!this.groups.has(group)) {
                        this.groups.set(group, new Set());
                    }
                    this.groups.get(group)!.add(testItem);
                }
            }
        }
    }

    delete(testItem: TestItem): void {
        this.definitions.delete(testItem.id);
        this.items.delete(testItem.id);
        for (const [key, members] of this.groups) {
            members.delete(testItem);
            if (members.size === 0) {
                this.groups.delete(key);
            }
        }
        for (const [, ids] of this.byUri) {
            ids.delete(testItem.id);
        }
    }

    deleteByUri(uri: string): void {
        const ids = this.byUri.get(uri);
        if (!ids) {
            return;
        }
        for (const id of ids) {
            const testItem = this.items.get(id);
            if (testItem) {
                this.definitions.delete(id);
                this.items.delete(id);
                for (const [key, members] of this.groups) {
                    members.delete(testItem);
                    if (members.size === 0) {
                        this.groups.delete(key);
                    }
                }
            }
        }
        this.byUri.delete(uri);
    }

    getDefinitionsByUri(uri: string): [TestItem, TestDefinition][] {
        const ids = this.byUri.get(uri);
        if (!ids) {
            return [];
        }
        const result: [TestItem, TestDefinition][] = [];
        for (const id of ids) {
            const item = this.items.get(id);
            const def = this.definitions.get(id);
            if (item && def) {
                result.push([item, def]);
            }
        }
        return result;
    }

    clear(): void {
        this.definitions.clear();
        this.items.clear();
        this.groups.clear();
        this.byUri.clear();
    }

    getDefinition(id: string): TestDefinition | undefined {
        return this.definitions.get(id);
    }

    getItem(id: string): TestItem | undefined {
        return this.items.get(id);
    }

    getGroups(): string[] {
        return [...this.groups.keys()].sort();
    }

    getItemsByGroup(group: string): TestItem[] {
        return [...(this.groups.get(group) ?? [])];
    }
}
