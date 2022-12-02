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

    getArguments(testId: string): string {
        const test = this.find(testId);

        if (!test) {
            return '';
        }

        const filter = this.asFilter(test) ?? '';

        return `${test.file} ${filter}`;
    }

    private find(label: string) {
        return this.doFind(label, this.tests);
    }

    private doFind(id: string, tests: Test[]): Test | void {
        for (const test of tests) {
            if (id === test.id) {
                return test;
            }

            if (test.children.length > 0) {
                return this.doFind(id, test.children);
            }
        }
    }

    private asFilter(test: Test) {
        return test.children.length > 0
            ? ''
            : `--filter '^.*::(${this.asDeps(test).join('|')})( with data set .*)?$'`;
    }

    private asDeps(test: Test) {
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
