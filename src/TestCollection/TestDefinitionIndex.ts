import type { TestItem } from 'vscode';
import { type TestDefinition, TestType } from '../PHPUnit';

type Entry = { item: TestItem; definition: TestDefinition };

export class TestDefinitionIndex {
    private entries = new Map<string, Entry>();
    private groups = new Map<string, Set<TestItem>>();
    private byUri = new Map<string, Set<string>>();
    private idToUris = new Map<string, Set<string>>();

    set(uri: string, testItem: TestItem, testDefinition: TestDefinition): void {
        this.entries.set(testItem.id, { item: testItem, definition: testDefinition });

        const uriIds = this.byUri.get(uri) ?? new Set<string>();
        this.byUri.set(uri, uriIds);
        uriIds.add(testItem.id);

        const uris = this.idToUris.get(testItem.id) ?? new Set<string>();
        this.idToUris.set(testItem.id, uris);
        uris.add(uri);

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
        const uris = this.idToUris.get(testItem.id);
        if (uris) {
            for (const uri of uris) {
                this.byUri.get(uri)?.delete(testItem.id);
            }
            this.idToUris.delete(testItem.id);
        }
        this.deleteById(testItem.id);
    }

    deleteByUri(uri: string): void {
        const ids = this.byUri.get(uri);
        if (!ids) {
            return;
        }
        this.byUri.delete(uri);
        for (const id of ids) {
            const uris = this.idToUris.get(id);
            if (uris) {
                uris.delete(uri);
                if (uris.size === 0) {
                    this.idToUris.delete(id);
                    this.deleteById(id);
                }
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
            const entry = this.entries.get(id);
            if (entry) {
                result.push([entry.item, entry.definition]);
            }
        }
        return result;
    }

    clear(): void {
        this.entries.clear();
        this.groups.clear();
        this.byUri.clear();
        this.idToUris.clear();
    }

    getDefinitionsByType(type: TestType): [TestItem, TestDefinition][] {
        const result: [TestItem, TestDefinition][] = [];
        for (const { item, definition } of this.entries.values()) {
            if (definition.type === type) {
                result.push([item, definition]);
            }
        }
        return result;
    }

    getDefinition(id: string): TestDefinition | undefined {
        return this.entries.get(id)?.definition;
    }

    getItem(id: string): TestItem | undefined {
        return this.entries.get(id)?.item;
    }

    getGroups(): string[] {
        return [...this.groups.keys()].sort();
    }

    getItemsByGroup(group: string): TestItem[] {
        return [...(this.groups.get(group) ?? [])];
    }

    private deleteById(id: string): void {
        const entry = this.entries.get(id);
        if (!entry) {
            return;
        }
        this.entries.delete(id);
        this.removeFromGroups(entry.item);
    }

    private removeFromGroups(testItem: TestItem): void {
        for (const [key, members] of this.groups) {
            members.delete(testItem);
            if (members.size === 0) {
                this.groups.delete(key);
            }
        }
    }
}
