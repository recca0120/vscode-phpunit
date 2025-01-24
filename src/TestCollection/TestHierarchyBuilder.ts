import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { CustomWeakMap, TestDefinition, TestParser, TestType, TransformerFactory } from '../PHPUnit';
import { TestCase } from './TestCase';

export class TestHierarchyBuilder {
    private icons = {
        [TestType.namespace]: '$(symbol-namespace)',
        [TestType.class]: '$(symbol-class)',
        [TestType.method]: '$(symbol-method)',
        [TestType.describe]: '$(symbol-class)',
    };
    private length = 1;
    private readonly ancestors: [{ item: TestItem, type: TestType, children: TestItem[] }] = [
        { item: this.createProxyTestController(), type: TestType.namespace, children: [] },
    ];
    private testData = new CustomWeakMap<TestItem, TestCase>();

    constructor(private testParser: TestParser, private ctrl: TestController) {
        this.onInit();
    }

    onInit() {
        this.testParser.on(TestType.method, (testDefinition, index) => {
            this.ascend(this.length + testDefinition.depth);
            this.addTestItem(testDefinition, `${index}`);
        });
        this.testParser.on(TestType.describe, (testDefinition) => {
            this.ascend(this.length + testDefinition.depth);
            this.addTestItem(testDefinition, testDefinition.id);
        });
        this.testParser.on(TestType.class, (testDefinition) => {
            this.ascend(this.length + testDefinition.depth);
            this.addTestItem(testDefinition, testDefinition.id);
        });
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
        const converter = TransformerFactory.factory(testDefinition.classFQN!);

        let parentTestCollection = this.ctrl.items;
        let testItem: TestItem | undefined;
        let namespaceParts = testDefinition.label?.split('\\') ?? [];
        const vendorNamespace = namespaceParts.splice(0, 2).join('\\');
        namespaceParts = [vendorNamespace, ...namespaceParts].filter(value => !!value);
        this.length = namespaceParts.length;

        namespaceParts.forEach((namespacePart, index, namespaceParts) => {
            const type = TestType.namespace;

            const classFQN = namespaceParts.slice(0, index + 1).join('\\');
            const id = converter.uniqueId({ type, classFQN });
            const label = converter.generateLabel({ type, classFQN: namespacePart });
            const testDefinition = { type, id, namespace: classFQN, label, depth: index + 1 } as TestDefinition;

            testItem = parentTestCollection.get(testDefinition.id);
            if (!testItem) {
                testItem = this.ctrl.createTestItem(testDefinition.id, this.createLabel(testDefinition));
                testItem.canResolveChildren = true;
                testItem.sortText = testDefinition.id;
                parentTestCollection.add(testItem);
                this.testData.set(testItem, new TestCase(testDefinition));
            }

            const parent = this.ancestors[this.ancestors.length - 1];
            parent.children.push(testItem);
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });

            parentTestCollection = testItem.children;
        });
    }

    private addTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.createTestItem(testDefinition, sortText);
        const parent = this.ancestors[this.ancestors.length - 1];
        parent.children.push(testItem);

        if (testDefinition.type !== TestType.method) {
            this.ancestors.push({ item: testItem, type: testDefinition.type, children: [] });
        }

        this.testData.set(testItem, new TestCase(testDefinition));
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.ctrl.createTestItem(testDefinition.id, this.createLabel(testDefinition), Uri.file(testDefinition.file!));
        testItem.canResolveChildren = testDefinition.type === TestType.class;
        testItem.sortText = sortText;
        testItem.range = this.createRange(testDefinition);

        return testItem;
    }

    private ascend(depth: number) {
        while (this.ancestors.length > depth) {
            const finished = this.ancestors.pop()!;
            if (finished.type === TestType.method) {
                finished.item.children.replace(finished.children);
                continue;
            }

            for (const child of finished.children) {
                finished.item.children.add(child);
            }
        }
    };

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(testDefinition.start!.line - 1, testDefinition.start!.character),
            new Position(testDefinition.end!.line - 1, testDefinition.end!.character),
        );
    }

    private createProxyTestController() {
        return new Proxy(this.ctrl, {
            get(target: any, prop) {
                return prop === 'children' ? target.items : target[prop];
            },
        }) as TestItem;
    }

    private createLabel(testDefinition: TestDefinition) {
        const icon = this.icons[testDefinition.type];

        return icon ? `${icon} ${testDefinition.label}` : testDefinition.label;
    }
}