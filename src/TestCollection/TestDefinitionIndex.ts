import type { TestItem } from 'vscode';
import { TestType, type TestDefinition } from '../PHPUnit';

export class TestDefinitionIndex {
    private definitions = new Map<string, TestDefinition>();
    private items = new Map<string, TestItem>();
    private groups = new Map<string, Set<TestItem>>();

    set(testItem: TestItem, testDefinition: TestDefinition): void {
        this.definitions.set(testItem.id, testDefinition);
        this.items.set(testItem.id, testItem);

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
    }

    clear(): void {
        this.definitions.clear();
        this.items.clear();
        this.groups.clear();
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
