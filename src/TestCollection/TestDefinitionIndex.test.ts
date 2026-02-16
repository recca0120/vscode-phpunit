import { describe, expect, it } from 'vitest';
import type { TestItem } from 'vscode';
import { TestType, type TestDefinition } from '../PHPUnit';
import { TestDefinitionIndex } from './TestDefinitionIndex';

function createTestItem(id: string, tags: { id: string }[] = []): TestItem {
    return { id, tags, children: { size: 0 } } as any;
}

function createTestDef(type: string): TestDefinition {
    return { type } as TestDefinition;
}

describe('TestDefinitionIndex', () => {
    it('should store and retrieve definition and item by id', () => {
        const index = new TestDefinitionIndex();
        const item = createTestItem('test1');
        const def = createTestDef(TestType.method);

        index.set(item, def);

        expect(index.getDefinition('test1')).toBe(def);
        expect(index.getItem('test1')).toBe(item);
    });

    it('should build group index for method items with group tags', () => {
        const index = new TestDefinitionIndex();
        const item = createTestItem('test1', [{ id: 'group:integration' }]);

        index.set(item, createTestDef(TestType.method));

        expect(index.getGroups()).toEqual(['integration']);
        expect(index.getItemsByGroup('integration')).toEqual([item]);
    });

    it('should not index groups for non-method types', () => {
        const index = new TestDefinitionIndex();
        index.set(
            createTestItem('test1', [{ id: 'group:integration' }]),
            createTestDef(TestType.class),
        );

        expect(index.getGroups()).toEqual([]);
    });

    it('should remove item and clean up empty groups', () => {
        const index = new TestDefinitionIndex();
        const item = createTestItem('test1', [{ id: 'group:integration' }]);

        index.set(item, createTestDef(TestType.method));
        index.delete(item);

        expect(index.getDefinition('test1')).toBeUndefined();
        expect(index.getItem('test1')).toBeUndefined();
        expect(index.getGroups()).toEqual([]);
    });

    it('should not remove group when other items remain', () => {
        const index = new TestDefinitionIndex();
        const item1 = createTestItem('t1', [{ id: 'group:unit' }]);
        const item2 = createTestItem('t2', [{ id: 'group:unit' }]);

        index.set(item1, createTestDef(TestType.method));
        index.set(item2, createTestDef(TestType.method));
        index.delete(item1);

        expect(index.getGroups()).toEqual(['unit']);
        expect(index.getItemsByGroup('unit')).toEqual([item2]);
    });

    it('should clear all entries', () => {
        const index = new TestDefinitionIndex();
        index.set(createTestItem('t1', [{ id: 'group:unit' }]), createTestDef(TestType.method));
        index.set(createTestItem('t2'), createTestDef(TestType.class));

        index.clear();

        expect(index.getDefinition('t1')).toBeUndefined();
        expect(index.getItem('t2')).toBeUndefined();
        expect(index.getGroups()).toEqual([]);
    });

    it('should return empty array for unknown group', () => {
        const index = new TestDefinitionIndex();
        expect(index.getItemsByGroup('nonexistent')).toEqual([]);
    });
});
