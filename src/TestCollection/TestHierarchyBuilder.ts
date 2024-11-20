import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { TestDefinition, TestParser, TestType } from '../PHPUnit';
import { CustomWeakMap } from '../PHPUnit/utils';
import { TestCase } from './TestCollection';

export class TestHierarchyBuilder {
    private readonly ancestors: [{ item: TestItem, type: TestType, children: TestItem[] }] = [
        { item: this.createProxyTestController(), type: TestType.namespace, children: [] },
    ];
    private testData = new CustomWeakMap<TestItem, TestCase>();

    constructor(private testParser: TestParser, private ctrl: TestController) {
        this.onInit();
    }

    onInit() {
        this.testParser.on(TestType.method, (testDefinition, index) => {
            this.addTestItem(testDefinition, `${index}`);
        });
        this.testParser.on(TestType.class, (testDefinition) => {
            this.ascend(2);
            this.addTestItem(testDefinition, testDefinition.id);
        });
        this.testParser.on(TestType.namespace, (testDefinition) => {
            this.ascend(1);
            this.addTestItem(testDefinition, testDefinition.id);
        });
    }

    get() {
        this.ascend(0);

        return this.testData;
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
        if (testDefinition.type === TestType.namespace) {
            return this.createNamespaceTestItem(testDefinition, sortText);
        }

        const testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
        testItem.canResolveChildren = testDefinition.type === TestType.class;
        testItem.sortText = sortText;
        testItem.range = this.createRange(testDefinition);

        return testItem;
    }

    private createNamespaceTestItem(testDefinition: TestDefinition, sortText: string) {
        let testItem = this.ctrl.items.get(testDefinition.id);

        if (testItem) {
            return testItem;
        }

        testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label);
        testItem.canResolveChildren = true;
        testItem.sortText = sortText;

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
}