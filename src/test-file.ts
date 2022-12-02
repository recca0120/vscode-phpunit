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

    getArguments(testItem: TestItem) {
        const filter = this.toFilter(testItem) ?? '';

        return `${testItem.uri!.fsPath} ${filter}`;
    }

    private toFilter(testItem: TestItem) {
        if (testItem.canResolveChildren || !testItem.parent?.uri) {
            return '';
        }

        const filter = `^.*::(${this.deps(testItem).join('|')})( with data set .*)?$`;

        return `--filter '${filter}'`;
    }

    private deps(testItem: TestItem) {
        const test = this.tests
            .reduce((acc, test) => {
                acc.push(test);
                if (test.children) {
                    acc = acc.concat(test.children);
                }
                return acc;
            }, [] as Test[])
            .find((test) => test.method === testItem.label)!;

        return [test.method, ...(test.annotations.depends ?? [])];
    }

    private asTestItem(ctrl: TestController, test: Test, sortText: number | string) {
        const canResolveChildren = test.children.length > 0;
        const label = canResolveChildren ? test.qualifiedClass : test.method!;

        const testItem = ctrl.createTestItem(test.id, label, this.uri);
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
