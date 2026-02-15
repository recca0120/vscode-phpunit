import { inject, injectable } from 'inversify';
import type { Position, TestController, TestItem, TestItemCollection, TestRunRequest } from 'vscode';
import type { URI } from 'vscode-uri';
import {
    TestCollection as BaseTestCollection,
    type File,
    PHPUnitXML,
    type TestDefinition,
    TestType,
} from '../PHPUnit';
import { TYPES } from '../types';
import type { TestCase } from './TestCase';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection extends BaseTestCollection {
    private testItems = new Map<string, Map<TestItem, TestCase>>();
    private testCaseIndex = new Map<string, TestCase>();
    private _rootItems: TestItemCollection | undefined;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) phpUnitXML: PHPUnitXML,
    ) {
        super(phpUnitXML);
    }

    get rootItems(): TestItemCollection {
        return this._rootItems ?? this.ctrl.items;
    }

    setRootItems(items: TestItemCollection | undefined): void {
        this._rootItems = items;
    }

    getTestCase(testItem: TestItem): TestCase | undefined {
        return this.testCaseIndex.get(testItem.id);
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests: TestItem[] = [];
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

        const includeIds = new Set(request.include.map((item) => item.id));
        const tests: TestItem[] = [];
        for (const testData of this.testItems.values()) {
            testData.forEach((_, testItem: TestItem) => {
                if (includeIds.has(testItem.id)) {
                    tests.push(testItem);
                }
            });
        }

        return tests.length > 0 ? tests : undefined;
    }

    findGroups(): string[] {
        const groups = new Set<string>();
        for (const [, testData] of this.getTestData()) {
            testData.forEach((_, testItem: TestItem) => {
                (testItem.tags ?? [])
                    .filter((tag) => tag.id.startsWith('group:'))
                    .forEach((tag) => groups.add(tag.id.replace(/^group:/, '')));
            });
        }

        return [...groups].sort();
    }

    findTestsByGroup(group: string): TestItem[] {
        const groupTagId = `group:${group}`;
        const tests: TestItem[] = [];
        for (const [, testData] of this.getTestData()) {
            for (const [testItem, testCase] of testData) {
                if (testCase.type !== TestType.method) {
                    continue;
                }

                if ((testItem.tags ?? []).some((tag) => tag.id === groupTagId)) {
                    tests.push(testItem);
                }
            }
        }

        return tests;
    }

    reset() {
        for (const testData of this.testItems.values()) {
            for (const [testItem] of testData) {
                testItem.parent
                    ? testItem.parent.children.delete(testItem.id)
                    : this.rootItems.delete(testItem.id);
            }
        }
        this.testCaseIndex.clear();

        return super.reset();
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(this.ctrl, testParser, this.rootItems);
        await testParser.parseFile(uri.fsPath, testsuite);

        this.removeTestItems(uri);
        this.clearTestCases(uri);
        for (const [testItem, testCase] of testHierarchyBuilder.get()) {
            this.setTestCase(uri, testItem, testCase);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.removeTestItems(file.uri);

        return super.deleteFile(file);
    }

    private setTestCase(uri: URI, testItem: TestItem, testCase: TestCase): void {
        this.getTestCases(uri).set(testItem, testCase);
        this.testCaseIndex.set(testItem.id, testCase);
    }

    private clearTestCases(uri: URI): void {
        const testData = this.getTestCases(uri);
        for (const [testItem] of testData) {
            this.testCaseIndex.delete(testItem.id);
        }
        testData.clear();
    }

    private getTestCases(uri: URI) {
        if (!this.testItems.has(uri.toString())) {
            this.testItems.set(uri.toString(), new Map<TestItem, TestCase>());
        }

        return this.testItems.get(uri.toString())!;
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
                this.rootItems.delete(testItem.id);

                return;
            }

            let current = testItem;
            while (current.parent) {
                const parent = current.parent;
                parent.children.delete(current.id);
                if (parent.children.size !== 0) {
                    break;
                }

                current = parent;
                // Stop when reaching the folder root boundary (identity check: parent.children is the rootItems collection)
                if (!current.parent || current.parent.children === this._rootItems) {
                    this.rootItems.delete(current.id);
                    break;
                }
            }
        });
    }
}
