import { Position, Range, type TestController, type TestItem, type TestItemCollection, TestTag, Uri } from 'vscode';
import {
    type TestDefinition,
    type TestParser,
    TestType,
    TransformerFactory,
} from '../PHPUnit';
import { TestCase } from './TestCase';

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
    private testData = new Map<TestItem, TestCase>();

    constructor(
        private ctrl: TestController,
        private testParser: TestParser,
        private rootItems: TestItemCollection = ctrl.items,
    ) {
        this.onInit();
    }

    onInit() {
        for (const type of [TestType.method, TestType.describe, TestType.class] as const) {
            this.testParser.on(type, (testDefinition, index) => {
                this.ascend(this.ancestorDepth + testDefinition.depth);
                this.addTestItem(testDefinition, type === TestType.method ? `${index}` : testDefinition.id);
            });
        }
        this.testParser.on(TestType.namespace, (testDefinition) => {
            this.ascend(1);
            this.addNamespaceTestItems(testDefinition);
        });
    }

    get() {
        this.ascend(0);

        return this.testData;
    }

    private addNamespaceTestItems(testDefinition: TestDefinition) {
        const transformer = TransformerFactory.create(testDefinition.classFQN!);

        let children = this.rootItems;
        let testItem: TestItem | undefined;
        let parts = testDefinition.label?.split('\\') ?? [];
        parts = parts.filter((value) => !!value);

        parts.forEach((part, index, parts) => {
            const type = TestType.namespace;

            const classFQN = parts.slice(0, index + 1).join('\\');
            const id = transformer.uniqueId({ type, classFQN });
            const label = transformer.generateLabel({ type, classFQN: part });
            const namespaceDefinition = {
                type,
                id,
                namespace: classFQN,
                label,
                depth: index + 1,
            } as TestDefinition;

            testItem = children.get(namespaceDefinition.id);
            if (!testItem) {
                testItem = this.ctrl.createTestItem(
                    namespaceDefinition.id,
                    this.parseLabelWithIcon(namespaceDefinition),
                );
                testItem.canResolveChildren = true;
                testItem.sortText = namespaceDefinition.id;
                children.add(testItem);
                this.testData.set(testItem, new TestCase(namespaceDefinition));
            }

            const parent = this.ancestors[this.ancestors.length - 1];
            parent.children.push(testItem);
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });

            children = testItem.children;
        });
        this.ancestorDepth = this.ancestors.length - 1;
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

        this.testData.set(testItem, new TestCase(testDefinition));
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.ctrl.createTestItem(
            testDefinition.id,
            this.parseLabelWithIcon(testDefinition),
            Uri.file(testDefinition.file!),
        );
        testItem.canResolveChildren = testDefinition.type === TestType.class;
        testItem.sortText = sortText;
        testItem.range = this.createRange(testDefinition);

        const groups = (testDefinition.annotations?.group as string[]) ?? [];
        if (groups.length > 0) {
            testItem.tags = groups.map((g) => new TestTag(`group:${g}`));
        }

        return testItem;
    }

    private ascend(depth: number) {
        while (this.ancestors.length > depth) {
            const completedAncestor = this.ancestors.pop()!;
            if (completedAncestor.type === TestType.method) {
                completedAncestor.item.children.replace(completedAncestor.children);
                continue;
            }

            for (const child of completedAncestor.children) {
                completedAncestor.item.children.add(child);
            }
        }
    }

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
            new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
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
