import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition as BaseTestDefinition, TestParser } from './PHPUnit';
import { BaseTestCollection } from './PHPUnit/TestCollection';

export type TestDefinition = BaseTestDefinition & {
    testItem: TestItem
    parent?: TestDefinition;
    children: TestDefinition[]
}

export class TestCollection extends BaseTestCollection<TestDefinition> {
    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    protected async convertTests(testDefinitions: TestDefinition[]) {
        return testDefinitions.map((testDefinition: TestDefinition) => {
            const testItem = this.createTestItem(testDefinition, testDefinition.id);

            testDefinition.children.forEach((testDefinition: TestDefinition, index) => {
                const child = this.createTestItem(testDefinition, `${index}`);
                testItem.children.add(child);

                Object.assign(testDefinition, { testItem: child });
            });

            this.ctrl.items.add(testItem);

            return Object.assign(testDefinition, { testItem: testItem }) as TestDefinition;
        });
    }

    private createTestItem(testDefinition: TestDefinition, sortText: string) {
        const testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
        testItem.canResolveChildren = testDefinition.children.length > 0;
        testItem.sortText = sortText;
        testItem.range = new Range(
            new Position(testDefinition.start.line - 1, testDefinition.start.character),
            new Position(testDefinition.end.line - 1, testDefinition.end.character),
        );

        return testItem;
    }

    delete(uri: URI) {
        this.findFile(uri)?.tests.forEach((test: TestDefinition) => {
            this.ctrl.items.delete(test.id);
        });

        return super.delete(uri);
    }
}