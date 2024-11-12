import { Position, Range, TestController, Uri } from 'vscode';
import { PHPUnitXML, TestDefinition, TestParser } from './PHPUnit';
import { BaseTestCollection } from './PHPUnit/TestCollection';


export class TestCollection extends BaseTestCollection<TestDefinition> {
    constructor(private ctrl: TestController, phpUnitXML: PHPUnitXML, testParser: TestParser) {
        super(phpUnitXML, testParser);
    }

    protected async convertTests(testDefinitions: TestDefinition[]) {
        testDefinitions.map((testDefinition: TestDefinition) => {
            const parent = this.ctrl.createTestItem(testDefinition.id, testDefinition.label, Uri.file(testDefinition.file!));
            parent.canResolveChildren = true;
            parent.sortText = testDefinition.id;
            parent.range = new Range(
                new Position(testDefinition.start.line - 1, testDefinition.start.character),
                new Position(testDefinition.end.line - 1, testDefinition.end.character),
            );
            this.ctrl.items.add(parent);

            testDefinition.children!.forEach((test: TestDefinition, index) => {
                const child = this.ctrl.createTestItem(test.id, test.label, Uri.file(test.file!));
                child.canResolveChildren = false;
                child.sortText = `${index}`;
                child.range = new Range(
                    new Position(test.start.line - 1, test.start.character),
                    new Position(test.end.line - 1, test.end.character),
                );
                parent.children.add(child);
            });

            return parent;
        });

        return testDefinitions;
    }
}