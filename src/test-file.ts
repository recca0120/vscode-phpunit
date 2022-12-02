import { Position, Range, TestController, TestItem, Uri } from 'vscode';
import { Test } from './phpunit/parser';

export class TestFile {
    public testItems: TestItem[] = [];

    constructor(public uri: Uri, public tests: Test[]) {}

    update(ctrl: TestController) {
        this.testItems = this.tests.map((suite: Test) => {
            const parent = this.asTestItem(ctrl, suite, suite.id);
            parent.children.replace(
                suite.children.map((test: Test, index) => this.asTestItem(ctrl, test, index))
            );

            return parent;
        });

        return this;
    }

    delete(ctrl: TestController) {
        this.testItems.forEach((testItem) => ctrl.items.delete(testItem.id));
    }

    private asTestItem(ctrl: TestController, test: Test, sortText: number | string) {
        const canResolveChildren = test.children.length > 0;
        const testId = canResolveChildren ? test.qualifiedClass : test.method!;

        const testItem = ctrl.createTestItem(test.id, testId, this.uri);
        ctrl.items.add(testItem);

        testItem.sortText = `${sortText}`;
        testItem.canResolveChildren = canResolveChildren;
        testItem.range = new Range(
            new Position(test.start.line - 1, test.start.character),
            new Position(test.end.line - 1, test.end.character)
        );

        return testItem;
    }
}
