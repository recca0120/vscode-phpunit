import {
    Position,
    Range,
    TestController,
    TestItem,
    TestItemCollection,
    Uri,
    workspace,
} from 'vscode';
import { parse, Test } from './phpunit';

const textDecoder = new TextDecoder('utf-8');

export class TestFile {
    public tests: Test[] = [];
    public testItems: TestItem[] = [];

    constructor(public uri: Uri) {}

    async update(ctrl: TestController) {
        const rawContent = textDecoder.decode(await workspace.fs.readFile(this.uri));
        this.tests = parse(rawContent, this.uri.fsPath) ?? [];

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
        this.testItems = [];
    }

    getArguments(testId: string): string {
        const test = this.findTest(testId);

        if (!test) {
            return '';
        }

        const filter = this.asFilter(test) ?? '';

        return `${test.file} ${filter}`;
    }

    findTestItemByPosition(position: Position) {
        return (
            this.doFindTestItem(this.testItems, (testItem: TestItem) => {
                if (testItem.canResolveChildren) {
                    return false;
                }

                const range = testItem.range!;

                return position.line >= range.start.line && position.line <= range.end.line;
            }) ?? this.testItems[0]
        );
    }

    private doFindTestItem(
        testItems: TestItem[],
        filter: (testItem: TestItem) => boolean
    ): TestItem | void {
        for (const testItem of testItems) {
            if (filter(testItem)) {
                return testItem;
            }

            if (testItem.children.size > 0) {
                return this.doFindTestItem(this.gatherTestItems(testItem.children), filter);
            }
        }
    }

    private gatherTestItems(collection: TestItemCollection) {
        const items: TestItem[] = [];
        collection.forEach((item) => items.push(item));

        return items;
    }

    private findTest(testId: string) {
        return this.doFindTest(this.tests, (test: Test) => testId === test.id);
    }

    private doFindTest(tests: Test[], filter: (test: Test) => boolean): Test | void {
        for (const test of tests) {
            if (filter(test)) {
                return test;
            }

            if (test.children.length > 0) {
                return this.doFindTest(test.children, filter);
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
        const testItem = ctrl.createTestItem(test.id, this.getLabel(test), this.uri);
        ctrl.items.add(testItem);

        testItem.sortText = `${sortText}`;
        testItem.canResolveChildren = test.children.length > 0;
        testItem.range = new Range(
            new Position(test.start.line - 1, test.start.character),
            new Position(test.end.line - 1, test.end.character)
        );

        return testItem;
    }

    private getLabel(test: Test) {
        if (test.annotations.testdox && test.annotations.testdox.length > 0) {
            return test.annotations.testdox[test.annotations.testdox.length - 1];
        }

        return (test.children.length > 0 ? test.qualifiedClass : test.method) ?? '';
    }
}
