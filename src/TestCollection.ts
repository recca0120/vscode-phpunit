import { Position, Range, TestController, TestItem, TestItemCollection, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition as BaseTestDefinition, TestParser } from './PHPUnit';
import { BaseTestCollection } from './PHPUnit/TestCollection';

export type TestDefinition = BaseTestDefinition & {
    testItem: TestItem
    parent?: TestDefinition;
    children?: TestDefinition[]
}

export class TestCollection extends BaseTestCollection<TestDefinition> {
    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    protected async convertTests(testDefinitions: TestDefinition[], _group: string, _groups: string[]) {
        return testDefinitions.map((testDefinition: TestDefinition) => {
            const testItem = this.createTestItem(testDefinition, testDefinition.id);

            testDefinition.children?.forEach((testDefinition: TestDefinition, index) => {
                const child = this.createTestItem(testDefinition, `${index}`);
                testItem.children.add(child);

                Object.assign(testDefinition, { testItem: child });
            });

            let parent: TestItemCollection = this.ctrl.items;

            // if (groups.length > 1) {
            //     let groupTestItem = parent.get(group);
            //     if (!groupTestItem) {
            //         groupTestItem = this.ctrl.createTestItem(group, group);
            //         groupTestItem.canResolveChildren = true;
            //         groupTestItem.sortText = group;
            //         parent.add(groupTestItem);
            //     }
            //     parent = groupTestItem.children;
            // }

            if (testDefinition.namespace) {
                const itemId = `namespace:${testDefinition.namespace}`;
                const label = testDefinition.namespace;
                let parentTestItem = parent.get(itemId);
                if (!parentTestItem) {
                    parentTestItem = this.ctrl.createTestItem(itemId, label);
                    parentTestItem.canResolveChildren = true;
                    parentTestItem.sortText = label;
                    parent.add(parentTestItem);
                }
                parent = parentTestItem.children;
            }

            parent.add(testItem);

            return Object.assign(testDefinition, { testItem: testItem }) as TestDefinition;
        });
    }

    delete(uri: URI) {
        this.findFile(uri)?.tests.forEach((test: TestDefinition) => {
            this.ctrl.items.delete(test.id);
        });

        return super.delete(uri);
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
        testItem.canResolveChildren = !!testDefinition.children && testDefinition.children.length > 0;
        testItem.sortText = sortText;
        if (testDefinition.start && testDefinition.end) {
            testItem.range = new Range(
                new Position(testDefinition.start.line - 1, testDefinition.start.character),
                new Position(testDefinition.end.line - 1, testDefinition.end.character),
            );
        }

        return testItem;
    }
}