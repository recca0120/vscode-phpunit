import type { PHPUnitXML } from '../Configuration/PHPUnitXML';
import { TestIdentifierFactory } from '../TestIdentifier/TestIdentifierFactory';
import { createDatasetDefinition } from '../TestParser/TestDefinitionBuilder';
import { type TestDefinition, TestType } from '../types';

export interface ItemCollection<T> {
    get(id: string): T | undefined;
    add(item: T): void;
    replace(items: T[]): void;
    readonly size: number;
}

export interface TestTreeItem<T> {
    id: string;
    children: ItemCollection<T>;
    canResolveChildren: boolean;
    sortText?: string;
    tags: readonly { id: string }[];
}

export abstract class TestHierarchyBuilder<T extends TestTreeItem<T>> {
    private testData = new Map<T, TestDefinition>();
    private multiSuite: boolean;

    constructor(
        private rootItems: ItemCollection<T>,
        private phpUnitXML?: PHPUnitXML,
    ) {
        this.multiSuite = (phpUnitXML?.getTestSuiteNames() ?? []).length > 1;
    }

    build(tests: TestDefinition[]): Map<T, TestDefinition> {
        for (const test of tests) {
            this.processNode(test, this.rootItems);
        }
        return this.testData;
    }

    protected abstract createItem(id: string, label: string, uri?: string): T;
    protected abstract createTag(id: string): { id: string };
    protected abstract createRange(
        def: TestDefinition,
    ):
        | { start: { line: number; character: number }; end: { line: number; character: number } }
        | undefined;

    protected formatLabel(testDefinition: TestDefinition): string {
        return testDefinition.label;
    }

    private processNode(test: TestDefinition, parentChildren: ItemCollection<T>) {
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

    private processNamespace(test: TestDefinition, parentChildren: ItemCollection<T>) {
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

    private processLeafOrBranch(test: TestDefinition, parentChildren: ItemCollection<T>) {
        const sortText =
            test.type === TestType.class ? test.id : this.insertionSortText(parentChildren.size);
        const testItem = this.createTestItemFromDef(test, sortText);
        parentChildren.add(testItem);
        this.testData.set(testItem, test);

        if (!test.children) {
            return;
        }

        const children: T[] = [];
        for (const child of test.children) {
            this.buildChild(child, children, testItem);
        }
        testItem.children.replace(children);
    }

    private buildChild(test: TestDefinition, siblings: T[], parentItem: T) {
        const testItem = this.createTestItemFromDef(test, this.insertionSortText(siblings.length));
        this.inheritParentTags(testItem, parentItem);
        siblings.push(testItem);
        this.testData.set(testItem, test);

        const allChildren = [...(test.children ?? [])];
        const dataset = test.annotations?.dataset;
        if (dataset && dataset.length > 0) {
            for (const label of dataset) {
                allChildren.push(createDatasetDefinition(test, label));
            }
        }

        if (allChildren.length === 0) {
            return;
        }

        const children: T[] = [];
        for (const child of allChildren) {
            this.buildChild(child, children, testItem);
        }
        testItem.children.replace(children);
    }

    private addTestSuiteRoot(
        testDefinition: TestDefinition,
        parentChildren: ItemCollection<T>,
    ): ItemCollection<T> {
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
            testItem = this.createItem(suiteId, this.formatLabel(suiteDefinition));
            testItem.canResolveChildren = true;
            testItem.sortText = suiteId;
            parentChildren.add(testItem);
        }
        this.testData.set(testItem, suiteDefinition);

        return testItem.children;
    }

    private addNamespaceTestItems(
        testDefinition: TestDefinition,
        parentChildren: ItemCollection<T>,
        skipParts = 0,
    ): ItemCollection<T> {
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
        children: ItemCollection<T>,
        transformer: ReturnType<typeof TestIdentifierFactory.create>,
        parts: string[],
        part: string,
        index: number,
    ): T {
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

        const testItem = this.createItem(
            namespaceDefinition.id,
            this.formatLabel(namespaceDefinition),
        );
        testItem.canResolveChildren = true;
        testItem.sortText = namespaceDefinition.id;
        children.add(testItem);
        this.testData.set(testItem, namespaceDefinition);

        return testItem;
    }

    private inheritParentTags(testItem: T, parentItem: T) {
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

    private createTestItemFromDef(testDefinition: TestDefinition, sortText: string): T {
        const file = testDefinition.file;
        if (!file) {
            throw new Error(`Test definition ${testDefinition.id} has no file`);
        }

        const testItem = this.createItem(testDefinition.id, this.formatLabel(testDefinition), file);
        testItem.canResolveChildren = testDefinition.type === TestType.class;
        testItem.sortText = sortText;

        const range = this.createRange(testDefinition);
        if (range) {
            (testItem as TestTreeItem<T> & { range?: unknown }).range = range;
        }

        const tags: Array<{ id: string }> = [];

        const groups = (testDefinition.annotations?.group as string[]) ?? [];
        for (const g of groups) {
            tags.push(this.createTag(`group:${g}`));
        }

        if (testDefinition.testsuite) {
            tags.push(this.createTag(`suite:${testDefinition.testsuite}`));
        }

        if (tags.length > 0) {
            testItem.tags = tags;
        }

        return testItem;
    }

    private insertionSortText(index: number): string {
        return String(index).padStart(5, '0');
    }

    private suiteNamespacePrefixLength(test: TestDefinition): number {
        const suiteName = test.testsuite;
        if (!suiteName || !this.phpUnitXML) {
            return 0;
        }

        const namespaceParts = (test.label?.split('\\') ?? []).filter(Boolean);
        const directories = this.phpUnitXML.getTestSuiteDirectories(suiteName);

        let best = 0;
        for (const dir of directories) {
            const dirParts = dir.split(/[/\\]/).filter(Boolean);
            if (dirParts.length > namespaceParts.length) {
                continue;
            }

            let allMatch = true;
            for (let i = 0; i < dirParts.length; i++) {
                if (dirParts[i].toLowerCase() !== namespaceParts[i].toLowerCase()) {
                    allMatch = false;
                    break;
                }
            }

            if (allMatch && dirParts.length > best) {
                best = dirParts.length;
            }
        }

        return best;
    }
}
