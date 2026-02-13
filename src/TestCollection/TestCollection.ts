import type { Position, TestController, TestItem, TestRunRequest } from 'vscode';
import type { URI } from 'vscode-uri';
import {
    TestCollection as BaseTestCollection,
    CustomWeakMap,
    type File,
    type PHPUnitXML,
    type TestDefinition,
    TestType,
} from '../PHPUnit';
import type { TestCase } from './TestCase';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

export class TestCollection extends BaseTestCollection {
    private testItems = new Map<string, Map<string, CustomWeakMap<TestItem, TestCase>>>();

    constructor(
        private ctrl: TestController,
        phpUnitXML: PHPUnitXML,
    ) {
        super(phpUnitXML);
    }

    getTestCase(testItem: TestItem): TestCase | undefined {
        for (const [, testData] of this.getTestData()) {
            const testCase = testData.get(testItem);
            if (testCase) {
                return testCase;
            }
        }

        return;
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests = [] as TestItem[];
        for (const [testItem, testCase] of this.getTestCases(uri)) {
            if (testCase.type === TestType.class) {
                tests.push(testItem);
            }
        }

        return tests;
    }

    findTestsByPosition(uri: URI, position: Position): TestItem[] {
        const items = this.inRangeTestItems(uri, position);

        return items.length > 0 ? [items[0]] : this.findTestsByFile(uri);
    }

    findTestsByRequest(request?: TestRunRequest) {
        if (!request || !request.include) {
            return undefined;
        }

        const include = request.include;
        const tests: TestItem[] = [];
        for (const [, testData] of this.getTestData()) {
            testData.forEach((_, testItem: TestItem) => {
                include.forEach((requestedItem) => {
                    if (requestedItem.id === testItem.id) {
                        tests.push(testItem);
                    }
                });
            });
        }

        return tests.length > 0 ? tests : undefined;
    }

    reset() {
        for (const [, testData] of this.getTestData()) {
            for (const [testItem] of testData) {
                testItem.parent
                    ? testItem.parent.children.delete(testItem.id)
                    : this.ctrl.items.delete(testItem.id);
            }
        }

        return super.reset();
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(this.ctrl, testParser);
        await testParser.parseFile(uri.fsPath, testsuite);

        this.removeTestItems(uri);
        const testData = this.getTestCases(uri);
        testData.clear();
        for (const [testItem, testCase] of testHierarchyBuilder.get()) {
            testData.set(testItem, testCase);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.removeTestItems(file.uri);

        return super.deleteFile(file);
    }

    private getTestCases(uri: URI) {
        const testData = this.getTestData();
        if (!testData.has(uri.toString())) {
            testData.set(uri.toString(), new CustomWeakMap<TestItem, TestCase>());
        }

        return testData.get(uri.toString())!;
    }

    private getTestData() {
        const workspace = this.getWorkspace();
        if (!this.testItems.has(workspace.fsPath)) {
            this.testItems.set(
                workspace.fsPath,
                new Map<string, CustomWeakMap<TestItem, TestCase>>(),
            );
        }

        return this.testItems.get(workspace.fsPath)!;
    }

    private inRangeTestItems(uri: URI, position: Position) {
        const items: TestItem[] = [];
        for (const [testItem, testCase] of this.getTestCases(uri)) {
            if (testCase.inRange(testItem, position)) {
                items.push(testItem);
            }
        }
        items.sort((a, b) => this.compareFn(b, position) - this.compareFn(a, position));

        return items;
    }

    private compareFn(testItem: TestItem, position: Position) {
        return testItem.range!.start.line - position.line;
    }

    private removeTestItems(uri: URI) {
        this.findTestsByFile(uri).forEach((testItem) => {
            if (!testItem.parent) {
                this.ctrl.items.delete(testItem.id);

                return;
            }

            let current = testItem;
            while (current.parent) {
                const parent = current.parent;
                const children = parent.children;
                children.delete(current.id);
                if (children.size !== 0) {
                    break;
                }

                current = parent;
                if (!current.parent) {
                    this.ctrl.items.delete(current.id);
                }
            }
        });
    }
}
