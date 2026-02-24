import { beforeEach, describe, expect, it } from 'vitest';
import { PHPUnitXML } from '../Configuration/PHPUnitXML';
import { type TestDefinition, TestType } from '../types';
import {
    type ItemCollection,
    TestHierarchyBuilder,
    type TestRange,
    type TestTreeItem,
} from './TestHierarchyBuilder';

// --- Simple in-memory implementation for testing ---

class SimpleItem implements TestTreeItem<SimpleItem> {
    id: string;
    label: string;
    children: ItemCollection<SimpleItem>;
    canResolveChildren = false;
    sortText = '';
    tags: Array<{ id: string }> = [];
    uri?: string;
    range?: TestRange;

    constructor(id: string, label: string, uri?: string) {
        this.id = id;
        this.label = label;
        this.uri = uri;
        this.children = new SimpleCollection();
    }
}

class SimpleCollection implements ItemCollection<SimpleItem> {
    private items = new Map<string, SimpleItem>();

    get(id: string): SimpleItem | undefined {
        return this.items.get(id);
    }

    add(item: SimpleItem): void {
        this.items.set(item.id, item);
    }

    replace(items: SimpleItem[]): void {
        this.items.clear();
        for (const item of items) {
            this.items.set(item.id, item);
        }
    }

    get size(): number {
        return this.items.size;
    }

    toArray(): SimpleItem[] {
        return [...this.items.values()];
    }
}

class SimpleBuilder extends TestHierarchyBuilder<SimpleItem> {
    protected createItem(id: string, label: string, uri?: string): SimpleItem {
        return new SimpleItem(id, label, uri);
    }

    protected createTag(id: string): { id: string } {
        return { id };
    }

    protected createRange(def: TestDefinition) {
        return {
            start: { line: (def.start?.line ?? 1) - 1, character: def.start?.character ?? 0 },
            end: { line: (def.end?.line ?? 1) - 1, character: def.end?.character ?? 0 },
        };
    }
}

// --- Helpers ---

function collectIds(root: SimpleCollection): string[] {
    const ids: string[] = [];
    const walk = (col: SimpleCollection) => {
        for (const item of col.toArray()) {
            ids.push(item.id);
            walk(item.children as SimpleCollection);
        }
    };
    walk(root);
    return ids;
}

// --- Tests ---

describe('TestHierarchyBuilder', () => {
    let rootItems: SimpleCollection;

    beforeEach(() => {
        rootItems = new SimpleCollection();
    });

    function build(tests: TestDefinition[], phpUnitXML?: PHPUnitXML) {
        const builder = new SimpleBuilder(rootItems, phpUnitXML);
        return builder.build(tests);
    }

    it('should split namespace into nested items', () => {
        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:App\\Tests\\Unit',
                label: 'App\\Tests\\Unit',
                classFQN: 'App\\Tests\\Unit\\ExampleTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\Tests\\Unit\\ExampleTest',
                        label: 'ExampleTest',
                        className: 'ExampleTest',
                        classFQN: 'App\\Tests\\Unit\\ExampleTest',
                        file: '/tmp/ExampleTest.php',
                        start: { line: 10, character: 0 },
                        end: { line: 50, character: 0 },
                    },
                ],
            },
        ];

        build(tests);

        // Should have 3 nested namespace items: App > Tests > Unit
        const app = rootItems.toArray()[0];
        expect(app).toBeDefined();
        expect(app.label).toContain('App');

        const testsNs = (app.children as SimpleCollection).toArray()[0];
        expect(testsNs).toBeDefined();
        expect(testsNs.label).toContain('Tests');

        const unit = (testsNs.children as SimpleCollection).toArray()[0];
        expect(unit).toBeDefined();
        expect(unit.label).toContain('Unit');

        // Class under Unit namespace
        const cls = (unit.children as SimpleCollection).toArray()[0];
        expect(cls).toBeDefined();
        expect(cls.label).toContain('ExampleTest');
    });

    it('should share namespace items for classes in same namespace', () => {
        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:App\\Tests',
                label: 'App\\Tests',
                classFQN: 'App\\Tests\\FooTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\Tests\\FooTest',
                        label: 'FooTest',
                        className: 'FooTest',
                        classFQN: 'App\\Tests\\FooTest',
                        file: '/tmp/FooTest.php',
                        start: { line: 1, character: 0 },
                        end: { line: 20, character: 0 },
                    },
                ],
            },
            {
                type: TestType.namespace,
                id: 'namespace:App\\Tests',
                label: 'App\\Tests',
                classFQN: 'App\\Tests\\BarTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\Tests\\BarTest',
                        label: 'BarTest',
                        className: 'BarTest',
                        classFQN: 'App\\Tests\\BarTest',
                        file: '/tmp/BarTest.php',
                        start: { line: 1, character: 0 },
                        end: { line: 20, character: 0 },
                    },
                ],
            },
        ];

        build(tests);

        // Only 1 "App" namespace item at root
        expect(rootItems.size).toBe(1);
        const app = rootItems.toArray()[0];
        const testsNs = (app.children as SimpleCollection).toArray()[0];
        // 2 classes under "Tests"
        expect((testsNs.children as SimpleCollection).size).toBe(2);
    });

    it('should expand dataset annotations into child items', () => {
        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:App\\Tests',
                label: 'App\\Tests',
                classFQN: 'App\\Tests\\DataTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\Tests\\DataTest',
                        label: 'DataTest',
                        className: 'DataTest',
                        classFQN: 'App\\Tests\\DataTest',
                        file: '/tmp/DataTest.php',
                        start: { line: 1, character: 0 },
                        end: { line: 30, character: 0 },
                        children: [
                            {
                                type: TestType.method,
                                id: 'App\\Tests\\DataTest::test_add',
                                label: 'test_add',
                                className: 'DataTest',
                                classFQN: 'App\\Tests\\DataTest',
                                methodName: 'test_add',
                                file: '/tmp/DataTest.php',
                                start: { line: 10, character: 0 },
                                end: { line: 20, character: 0 },
                                annotations: {
                                    dataset: ['"one"', '"two"'],
                                },
                            },
                        ],
                    },
                ],
            },
        ];

        build(tests);

        const allIds = collectIds(rootItems);
        expect(allIds).toContain('App\\Tests\\DataTest::test_add with data set "one"');
        expect(allIds).toContain('App\\Tests\\DataTest::test_add with data set "two"');
    });

    it('should add testsuite wrapper when multiple suites exist', () => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(
            `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
</phpunit>`,
            '/tmp',
        );

        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:Tests\\Unit',
                label: 'Tests\\Unit',
                classFQN: 'Tests\\Unit\\ExampleTest',
                testsuite: 'Unit',
                children: [
                    {
                        type: TestType.class,
                        id: 'Tests\\Unit\\ExampleTest',
                        label: 'ExampleTest',
                        className: 'ExampleTest',
                        classFQN: 'Tests\\Unit\\ExampleTest',
                        file: '/tmp/tests/Unit/ExampleTest.php',
                        testsuite: 'Unit',
                        start: { line: 1, character: 0 },
                        end: { line: 20, character: 0 },
                    },
                ],
            },
        ];

        build(tests, phpUnitXML);

        // Should have testsuite:Unit at root
        const suiteItem = rootItems.get('testsuite:Unit');
        expect(suiteItem).toBeDefined();
        expect(suiteItem?.label).toContain('Unit');
    });

    it('should NOT add testsuite wrapper when single suite', () => {
        const phpUnitXML = new PHPUnitXML();
        phpUnitXML.load(
            `<?xml version="1.0" encoding="UTF-8"?>
<phpunit>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
    </testsuites>
</phpunit>`,
            '/tmp',
        );

        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:Tests\\Unit',
                label: 'Tests\\Unit',
                classFQN: 'Tests\\Unit\\ExampleTest',
                testsuite: 'Unit',
                children: [
                    {
                        type: TestType.class,
                        id: 'Tests\\Unit\\ExampleTest',
                        label: 'ExampleTest',
                        className: 'ExampleTest',
                        classFQN: 'Tests\\Unit\\ExampleTest',
                        file: '/tmp/tests/Unit/ExampleTest.php',
                        testsuite: 'Unit',
                        start: { line: 1, character: 0 },
                        end: { line: 20, character: 0 },
                    },
                ],
            },
        ];

        build(tests, phpUnitXML);

        // No testsuite wrapper at root
        expect(rootItems.get('testsuite:Unit')).toBeUndefined();
        // Namespace items directly at root
        expect(rootItems.size).toBeGreaterThan(0);
    });

    it('should set range on test items from createRange', () => {
        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:App',
                label: 'App',
                classFQN: 'App\\RangeTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\RangeTest',
                        label: 'RangeTest',
                        className: 'RangeTest',
                        classFQN: 'App\\RangeTest',
                        file: '/tmp/RangeTest.php',
                        start: { line: 5, character: 0 },
                        end: { line: 25, character: 0 },
                    },
                ],
            },
        ];

        const result = build(tests);

        const classItem = [...result.entries()].find(([, def]) => def.id === 'App\\RangeTest')?.[0];
        expect(classItem?.range).toEqual({
            start: { line: 4, character: 0 },
            end: { line: 24, character: 0 },
        });
    });

    it('should return Map of item to TestDefinition', () => {
        const tests: TestDefinition[] = [
            {
                type: TestType.namespace,
                id: 'namespace:App',
                label: 'App',
                classFQN: 'App\\FooTest',
                children: [
                    {
                        type: TestType.class,
                        id: 'App\\FooTest',
                        label: 'FooTest',
                        className: 'FooTest',
                        classFQN: 'App\\FooTest',
                        file: '/tmp/FooTest.php',
                        start: { line: 1, character: 0 },
                        end: { line: 10, character: 0 },
                    },
                ],
            },
        ];

        const result = build(tests);

        expect(result.size).toBeGreaterThan(0);
        for (const [item, def] of result) {
            expect(item).toBeInstanceOf(SimpleItem);
            expect(def.type).toBeDefined();
        }
    });
});
