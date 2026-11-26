import { type TestDefinition, TestType } from '@vscode-phpunit/phpunit';
import { describe, expect, it } from 'vitest';
import type { TestItem } from 'vscode';
import { TestItemRegistry } from './TestItemRegistry';

function createTestItem(id: string, tags: { id: string }[] = []): TestItem {
    return { id, tags, children: { size: 0 } } as unknown as TestItem;
}

function createTestDef(type: TestType): TestDefinition {
    return { type, id: 'test', label: 'test' };
}

describe('TestItemRegistry', () => {
    it('should store and retrieve definition and item by id', () => {
        const registry = new TestItemRegistry();
        const item = createTestItem('test1');
        const def = createTestDef(TestType.method);

        registry.register('file:///a.php', item, def);

        expect(registry.definitionOf('test1')).toBe(def);
        expect(registry.itemOf('test1')).toBe(item);
    });

    it('should build group index for method items with group tags', () => {
        const registry = new TestItemRegistry();
        const item = createTestItem('test1', [{ id: 'group:integration' }]);

        registry.register('file:///a.php', item, createTestDef(TestType.method));

        expect(registry.groups()).toEqual(['integration']);
        expect(registry.itemsInGroup('integration')).toEqual([item]);
    });

    it('should not index groups for non-method types', () => {
        const registry = new TestItemRegistry();
        registry.register(
            'file:///a.php',
            createTestItem('test1', [{ id: 'group:integration' }]),
            createTestDef(TestType.class),
        );

        expect(registry.groups()).toEqual([]);
    });

    it('should remove item and clean up empty groups', () => {
        const registry = new TestItemRegistry();
        const item = createTestItem('test1', [{ id: 'group:integration' }]);

        registry.register('file:///a.php', item, createTestDef(TestType.method));
        registry.unregister(item);

        expect(registry.definitionOf('test1')).toBeUndefined();
        expect(registry.itemOf('test1')).toBeUndefined();
        expect(registry.groups()).toEqual([]);
    });

    it('should not remove group when other items remain', () => {
        const registry = new TestItemRegistry();
        const item1 = createTestItem('t1', [{ id: 'group:unit' }]);
        const item2 = createTestItem('t2', [{ id: 'group:unit' }]);

        registry.register('file:///a.php', item1, createTestDef(TestType.method));
        registry.register('file:///a.php', item2, createTestDef(TestType.method));
        registry.unregister(item1);

        expect(registry.groups()).toEqual(['unit']);
        expect(registry.itemsInGroup('unit')).toEqual([item2]);
    });

    it('should clear all entries', () => {
        const registry = new TestItemRegistry();
        registry.register(
            'file:///a.php',
            createTestItem('t1', [{ id: 'group:unit' }]),
            createTestDef(TestType.method),
        );
        registry.register('file:///b.php', createTestItem('t2'), createTestDef(TestType.class));

        registry.clear();

        expect(registry.definitionOf('t1')).toBeUndefined();
        expect(registry.itemOf('t2')).toBeUndefined();
        expect(registry.groups()).toEqual([]);
    });

    it('should return empty array for unknown group', () => {
        const registry = new TestItemRegistry();
        expect(registry.itemsInGroup('nonexistent')).toEqual([]);
    });

    it('should unregister all items of a file', () => {
        const registry = new TestItemRegistry();
        const item1 = createTestItem('t1', [{ id: 'group:unit' }]);
        const item2 = createTestItem('t2');
        const item3 = createTestItem('t3');

        registry.register('file:///a.php', item1, createTestDef(TestType.method));
        registry.register('file:///a.php', item2, createTestDef(TestType.class));
        registry.register('file:///b.php', item3, createTestDef(TestType.method));

        registry.unregisterFile('file:///a.php');

        expect(registry.definitionOf('t1')).toBeUndefined();
        expect(registry.definitionOf('t2')).toBeUndefined();
        expect(registry.definitionOf('t3')).toBeDefined();
        expect(registry.groups()).toEqual([]);
    });

    it('should get definitions by URI', () => {
        const registry = new TestItemRegistry();
        const item1 = createTestItem('t1');
        const def1 = createTestDef(TestType.method);
        const item2 = createTestItem('t2');
        const def2 = createTestDef(TestType.class);

        registry.register('file:///a.php', item1, def1);
        registry.register('file:///a.php', item2, def2);
        registry.register('file:///b.php', createTestItem('t3'), createTestDef(TestType.method));

        const result = registry.entriesIn('file:///a.php');
        expect(result).toEqual([
            [item1, def1],
            [item2, def2],
        ]);
    });

    it('should return empty array for unknown URI', () => {
        const registry = new TestItemRegistry();
        expect(registry.entriesIn('file:///unknown.php')).toEqual([]);
    });

    it('should keep shared items when unregisterFile removes only one file', () => {
        const registry = new TestItemRegistry();
        const namespace = createTestItem('namespace:Tests');
        const nsDef = createTestDef(TestType.namespace);
        const classA = createTestItem('ClassA');
        const classB = createTestItem('ClassB');

        registry.register('file:///a.php', namespace, nsDef);
        registry.register('file:///a.php', classA, createTestDef(TestType.class));

        registry.register('file:///b.php', namespace, nsDef);
        registry.register('file:///b.php', classB, createTestDef(TestType.class));

        registry.unregisterFile('file:///a.php');

        expect(registry.definitionOf('namespace:Tests')).toBe(nsDef);
        expect(registry.definitionOf('ClassA')).toBeUndefined();
        expect(registry.definitionOf('ClassB')).toBeDefined();
    });
});
