import {
    Position,
    Range,
    type TestController,
    type TestItem,
    type TestItemCollection,
    TestTag,
    Uri,
} from 'vscode';
import { type PHPUnitXML, type TestDefinition, TestIdentifierFactory, TestType } from '../PHPUnit';

const TEST_ICONS: Record<TestType, string> = {
    [TestType.workspace]: '$(folder)',
    [TestType.testsuite]: '$(symbol-namespace)',
    [TestType.namespace]: '$(symbol-namespace)',
    [TestType.class]: '$(symbol-class)',
    [TestType.method]: '$(symbol-method)',
    [TestType.describe]: '$(symbol-class)',
};

export function icon(type: TestType): string {
    return TEST_ICONS[type] ?? '';
}

export class TestHierarchyBuilder {
    private testData = new Map<TestItem, TestDefinition>();
    private multiSuite: boolean;

    constructor(
        private ctrl: TestController,
        private rootItems: TestItemCollection = ctrl.items,
        phpUnitXML?: PHPUnitXML,
    ) {
        this.multiSuite = (phpUnitXML?.getTestSuiteNames() ?? []).length > 1;
    }

    build(tests: TestDefinition[]): Map<TestItem, TestDefinition> {
        for (const test of tests) {
            this.processNode(test, this.rootItems);
        }

        return this.testData;
    }

    private processNode(test: TestDefinition, parentChildren: TestItemCollection) {
        switch (test.type) {
            case TestType.namespace:
                this.processNamespace(test, parentChildren);
                break;
            case TestType.class:
            case TestType.describe:
            case TestType.method:
                this.processLeafOrBranch(test, parentChildren);
                break;
        }
    }

    private processNamespace(test: TestDefinition, parentChildren: TestItemCollection) {
        let targetParent = parentChildren;
        let skipParts = 0;

        if (this.multiSuite) {
            targetParent = this.addTestSuiteRoot(test, parentChildren);
            skipParts = this.suiteNamespacePrefixLength(test);
        }

        const targetChildren = this.addNamespaceTestItems(test, targetParent, skipParts);

        if (!test.children) {
            return;
        }

        for (const child of test.children) {
            this.processNode(child, targetChildren);
        }
    }

    private processLeafOrBranch(test: TestDefinition, parentChildren: TestItemCollection) {
        const sortText =
            test.type === TestType.class ? test.id : this.insertionSortText(parentChildren.size);
        const testItem = this.createTestItem(test, sortText);
        parentChildren.add(testItem);
        this.testData.set(testItem, test);

        if (!test.children) {
            return;
        }

        const children: TestItem[] = [];
        for (const child of test.children) {
            this.buildChild(child, children, testItem);
        }
        testItem.children.replace(children);
    }

    private buildChild(test: TestDefinition, siblings: TestItem[], parentItem: TestItem) {
        const testItem = this.createTestItem(test, this.insertionSortText(siblings.length));
        this.inheritParentTags(testItem, parentItem);
        siblings.push(testItem);
        this.testData.set(testItem, test);

        if (!test.children) {
            return;
        }

        const children: TestItem[] = [];
        for (const child of test.children) {
            this.buildChild(child, children, testItem);
        }
        testItem.children.replace(children);
    }

    private addTestSuiteRoot(
        testDefinition: TestDefinition,
        parentChildren: TestItemCollection,
    ): TestItemCollection {
        const suiteName = testDefinition.testsuite;
        if (!suiteName) {
            return parentChildren;
        }

        const suiteId = `testsuite:${suiteName}`;
        const suiteDefinition: TestDefinition = {
            type: TestType.testsuite,
            id: suiteId,
            label: suiteName,
            testsuite: suiteName,
        };

        let testItem = parentChildren.get(suiteId);
        if (!testItem) {
            testItem = this.ctrl.createTestItem(suiteId, this.parseLabelWithIcon(suiteDefinition));
            testItem.canResolveChildren = true;
            testItem.sortText = suiteId;
            parentChildren.add(testItem);
        }
        this.testData.set(testItem, suiteDefinition);

        return testItem.children;
    }

    private addNamespaceTestItems(
        testDefinition: TestDefinition,
        parentChildren: TestItemCollection,
        skipParts = 0,
    ): TestItemCollection {
        const classFQN = testDefinition.classFQN ?? '';
        const transformer = TestIdentifierFactory.create(classFQN);
        const parts = (testDefinition.label?.split('\\') ?? []).filter((value) => !!value);

        let children = parentChildren;
        for (const [index, part] of parts.entries()) {
            if (index < skipParts) {
                continue;
            }
            const testItem = this.getOrCreateNamespaceItem(
                children,
                transformer,
                parts,
                part,
                index,
            );
            children = testItem.children;
        }

        return children;
    }

    private getOrCreateNamespaceItem(
        children: TestItemCollection,
        transformer: ReturnType<typeof TestIdentifierFactory.create>,
        parts: string[],
        part: string,
        index: number,
    ): TestItem {
        const type = TestType.namespace;
        const classFQN = parts.slice(0, index + 1).join('\\');
        const namespaceDefinition: TestDefinition = {
            type,
            id: transformer.uniqueId({ type, classFQN }),
            namespace: classFQN,
            label: transformer.generateLabel({ type, classFQN: part }),
        };

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

    private inheritParentTags(testItem: TestItem, parentItem: TestItem) {
        const parentTags = (parentItem.tags ?? []).filter((t) => t.id.startsWith('group:'));
        if (parentTags.length === 0) {
            return;
        }

        const ownTags = testItem.tags ?? [];
        testItem.tags = [
            ...ownTags,
            ...parentTags.filter((pt) => !ownTags.some((ot) => ot.id === pt.id)),
        ];
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

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(
                (testDefinition.start?.line ?? 1) - 1,
                testDefinition.start?.character ?? 0,
            ),
            new Position((testDefinition.end?.line ?? 1) - 1, testDefinition.end?.character ?? 0),
        );
    }

    private suiteNamespacePrefixLength(test: TestDefinition): number {
        const suiteName = test.testsuite;
        if (!suiteName) {
            return 0;
        }

        const parts = (test.label?.split('\\') ?? []).filter(Boolean);
        const idx = parts.indexOf(suiteName);

        return idx >= 0 ? idx + 1 : 0;
    }

    private parseLabelWithIcon(testDefinition: TestDefinition) {
        const prefix = icon(testDefinition.type);

        return prefix ? `${prefix} ${testDefinition.label}` : testDefinition.label;
    }

    // Produces a zero-padded sort key so Test Explorer preserves insertion order
    // under lexicographic sorting (supports up to 99999 items per level).
    private insertionSortText(index: number): string {
        return String(index).padStart(5, '0');
    }
}
