import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { URI } from 'vscode-uri';
import { PHPUnitXML, TestDefinition, TestParser } from './PHPUnit';
import { BaseTestCollection } from './PHPUnit/TestCollection';

export type TestDefinitionWithTestItem = TestDefinition & {
    testItem: TestItem
    parent?: TestDefinitionWithTestItem;
    children: TestDefinitionWithTestItem[]
}

export class TestCollection extends BaseTestCollection<TestDefinitionWithTestItem> {
    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    protected async convertTests(testDefinitions: TestDefinition[]) {
        return testDefinitions.map((testDefinition: TestDefinition) => {
            const testItem = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
            testItem.canResolveChildren = true;
            testItem.sortText = testDefinition.id;
            testItem.range = this.createRange(testDefinition);
            this.ctrl.items.add(testItem);

            testDefinition.children?.forEach((testDefinition: TestDefinition, index) => {
                const child = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
                child.canResolveChildren = false;
                child.sortText = `${index}`;
                child.range = this.createRange(testDefinition);
                testItem.children.add(child);

                Object.assign(testDefinition, { testItem: child });
            });

            return Object.assign(testDefinition, { testItem }) as TestDefinitionWithTestItem;
        });
    }

    delete(uri: URI) {
        this.findFile(uri)?.tests.forEach((test: TestDefinition) => {
            this.ctrl.items.delete(test.id);
        });

        return super.delete(uri);
    }

    private createRange(testDefinition: TestDefinition) {
        return new Range(
            new Position(testDefinition.start.line - 1, testDefinition.start.character),
            new Position(testDefinition.end.line - 1, testDefinition.end.character),
        );
    }
}