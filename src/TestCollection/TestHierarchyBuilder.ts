import {
    Position,
    Range,
    type TestController,
    type TestItem,
    type TestItemCollection,
    TestTag,
    Uri,
} from 'vscode';
import {
    type PHPUnitXML,
    type TestDefinition,
    type TestParser,
    TestType,
    TransformerFactory,
} from '../PHPUnit';

export class TestHierarchyBuilder {
    private icons = {
        [TestType.namespace]: '$(symbol-namespace)',
        [TestType.class]: '$(symbol-class)',
        [TestType.method]: '$(symbol-method)',
        [TestType.describe]: '$(symbol-class)',
    };
    private ancestorDepth = 1;
    private readonly ancestors: [{ item: TestItem; type: TestType; children: TestItem[] }] = [
        { item: this.createRootItem(), type: TestType.namespace, children: [] },
    ];
    private testData = new Map<TestItem, TestDefinition>();
    private multiSuite: boolean;

    constructor(
        private ctrl: TestController,
        private testParser: TestParser,
        private rootItems: TestItemCollection = ctrl.items,
        phpUnitXML?: PHPUnitXML,
    ) {
        this.multiSuite = (phpUnitXML?.getTestSuiteNames().length ?? 0) > 1;
        this.onInit();
    }

    onInit() {
        for (const type of [TestType.method, TestType.describe, TestType.class] as const) {
            this.testParser.on(type, (testDefinition, index) => {
                this.ascend(this.ancestorDepth + testDefinition.depth);
                this.addTestItem(
                    testDefinition,
                    type === TestType.method ? `${index}` : testDefinition.id,
                );
            });
        }
        this.testParser.on(TestType.namespace, (testDefinition) => {
            if (this.multiSuite) {
                this.addTestSuiteRoot(testDefinition);
            } else {
                this.ascend(1);
                this.addNamespaceTestItems(testDefinition);
            }
        });
    }

    get() {
        this.ascend(0);

        return this.testData;
    }

    private addTestSuiteRoot(testDefinition: TestDefinition) {
        const suiteName = testDefinition.testsuite;
        if (!suiteName) {
            return;
        }

        // Ascend to root level
        this.ascend(1);

        const suiteId = `testsuite:${suiteName}`;
        const existing = this.rootItems.get(suiteId);
        if (existing) {
            const parent = this.ancestors[this.ancestors.length - 1];
            parent.children.push(existing);
            this.ancestors.push({ item: existing, type: TestType.namespace, children: [] });
        } else {
            const suiteDefinition = {
                type: TestType.namespace,
                id: suiteId,
                label: suiteName,
                depth: 1,
            } as TestDefinition;

            const testItem = this.ctrl.createTestItem(
                suiteId,
                this.parseLabelWithIcon(suiteDefinition),
            );
            testItem.canResolveChildren = true;
            testItem.sortText = suiteId;
            this.rootItems.add(testItem);
            this.testData.set(testItem, suiteDefinition);

            const parent = this.ancestors[this.ancestors.length - 1];
            parent.children.push(testItem);
            this.ancestors.push({ item: testItem, type: TestType.namespace, children: [] });
        }

        this.ancestorDepth = this.ancestors.length - 1;
    }

    private addNamespaceTestItems(testDefinition: TestDefinition) {
        const classFQN = testDefinition.classFQN ?? '';
        const transformer = TransformerFactory.create(classFQN);
        const parts = (testDefinition.label?.split('\\') ?? []).filter((value) => !!value);

        let children = this.rootItems;
        for (const [index, part] of parts.entries()) {
            const testItem = this.getOrCreateNamespaceItem(
                children,
                transformer,
                parts,
                part,
                index,
            );

            const parent = this.ancestors[this.ancestors.length - 1];
            parent.children.push(testItem);
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });

            children = testItem.children;
        }
        this.ancestorDepth = this.ancestors.length - 1;
    }

    private getOrCreateNamespaceItem(
        children: TestItemCollection,
        transformer: ReturnType<typeof TransformerFactory.create>,
        parts: string[],
        part: string,
        index: number,
    ): TestItem {
        const type = TestType.namespace;
        const classFQN = parts.slice(0, index + 1).join('\\');
        const namespaceDefinition = {
            type,
            id: transformer.uniqueId({ type, classFQN }),
            namespace: classFQN,
            label: transformer.generateLabel({ type, classFQN: part }),
            depth: index + 1,
        } as TestDefinition;

        const existing = children.get(namespaceDefinition.id);
        if (existing) {
            this.testData.set(existing, namespaceDefinition);
            return existing;
        }

        const testItem = this.ctrl.createTestItem(
            namespaceDefinition.id,
            this.parseLabelWithIcon(namespaceDefinition),
        );
        testItem.canResolveChildren = true;
        testItem.sortText = namespaceDefinition.id;
        children.add(testItem);
        this.testData.set(testItem, namespaceDefinition);

        return testItem;
    }

    private addTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.createTestItem(testDefinition, sortText);
        const parent = this.ancestors[this.ancestors.length - 1];
        parent.children.push(testItem);

        // Inherit group tags from parent class to methods for proper filter inheritance
        if (testDefinition.type === TestType.method && parent.type === TestType.class) {
            const parentTags = (parent.item.tags ?? []).filter((t) => t.id.startsWith('group:'));
            if (parentTags.length > 0) {
                const ownTags = testItem.tags ?? [];
                testItem.tags = [
                    ...ownTags,
                    ...parentTags.filter((pt) => !ownTags.some((ot) => ot.id === pt.id)),
                ];
            }
        }

        if (testDefinition.type !== TestType.method) {
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });
        }

        this.testData.set(testItem, testDefinition);
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        const file = testDefinition.file;
        if (!file) {
            throw new Error(`Test definition ${testDefinition.id} has no file`);
        }

        const testItem = this.ctrl.createTestItem(
            testDefinition.id,
            this.parseLabelWithIcon(testDefinition),
            Uri.file(file),
        );
        testItem.canResolveChildren = testDefinition.type === TestType.class;
        testItem.sortText = sortText;
        testItem.range = this.createRange(testDefinition);

        const tags: TestTag[] = [];

        const groups = (testDefinition.annotations?.group as string[]) ?? [];
        for (const g of groups) {
            tags.push(new TestTag(`group:${g}`));
        }

        if (testDefinition.testsuite) {
            tags.push(new TestTag(`suite:${testDefinition.testsuite}`));
        }

        if (tags.length > 0) {
            testItem.tags = tags;
        }

        return testItem;
    }

    private ascend(depth: number) {
        while (this.ancestors.length > depth) {
            const completedAncestor = this.ancestors.pop();
            if (!completedAncestor) {
                break;
            }
            if (completedAncestor.type === TestType.namespace) {
                for (const child of completedAncestor.children) {
                    completedAncestor.item.children.add(child);
                }
            } else {
                completedAncestor.item.children.replace(completedAncestor.children);
            }
        }
    }

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(
                (testDefinition.start?.line ?? 1) - 1,
                testDefinition.start?.character ?? 0,
            ),
            new Position((testDefinition.end?.line ?? 1) - 1, testDefinition.end?.character ?? 0),
        );
    }

    private createRootItem(): TestItem {
        return { children: this.rootItems } as TestItem;
    }

    private parseLabelWithIcon(testDefinition: TestDefinition) {
        const icon = this.icons[testDefinition.type];

        return icon ? `${icon} ${testDefinition.label}` : testDefinition.label;
    }
}
