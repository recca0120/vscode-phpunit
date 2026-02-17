import type { TestItem } from 'vscode';
import { type TestDefinition, TestType } from '../PHPUnit';

export class TestDefinitionIndex {
    private definitions = new Map<string, TestDefinition>();
    private items = new Map<string, TestItem>();
    private groups = new Map<string, Set<TestItem>>();
    private byUri = new Map<string, Set<string>>();

    set(uri: string, testItem: TestItem, testDefinition: TestDefinition): void {
        this.definitions.set(testItem.id, testDefinition);
        this.items.set(testItem.id, testItem);

        const uriIds = this.byUri.get(uri) ?? new Set<string>();
        this.byUri.set(uri, uriIds);
        uriIds.add(testItem.id);

        if (testDefinition.type === TestType.method) {
            const groupPrefix = 'group:';
            for (const tag of testItem.tags ?? []) {
                if (tag.id.startsWith(groupPrefix)) {
                    const group = tag.id.slice(groupPrefix.length);
                    const members = this.groups.get(group) ?? new Set<TestItem>();
                    this.groups.set(group, members);
                    members.add(testItem);
                }
            }
        }
    }

    delete(testItem: TestItem): void {
        this.deleteById(testItem.id);
        for (const [, ids] of this.byUri) {
            ids.delete(testItem.id);
        }
    }

    deleteByUri(uri: string): void {
        const ids = this.byUri.get(uri);
        if (!ids) {
            return;
        }
        this.byUri.delete(uri);
        for (const id of ids) {
            if (!this.isReferencedByOtherUri(id)) {
                this.deleteById(id);
            }
        }
    }

    private isReferencedByOtherUri(id: string): boolean {
        for (const [, ids] of this.byUri) {
            if (ids.has(id)) {
                return true;
            }
        }
        return false;
    }

    private deleteById(id: string): void {
        const testItem = this.items.get(id);
        if (!testItem) {
            return;
        }
        this.definitions.delete(id);
        this.items.delete(id);
        this.removeFromGroups(testItem);
    }

    private removeFromGroups(testItem: TestItem): void {
        for (const [key, members] of this.groups) {
            members.delete(testItem);
            if (members.size === 0) {
                this.groups.delete(key);
            }
        }
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
