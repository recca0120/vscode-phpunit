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
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection extends BaseTestCollection {
    private testItems = new Map<string, Map<TestItem, TestDefinition>>();
    private testDefinitionIndex = new Map<string, TestDefinition>();
    private testItemIndex = new Map<string, TestItem>();
    private groupIndex = new Map<string, Set<TestItem>>();
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

    getTestDefinition(testItem: TestItem): TestDefinition | undefined {
        return this.testDefinitionIndex.get(testItem.id);
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests: TestItem[] = [];
        for (const [testItem, testDef] of this.getTestDefinitions(uri)) {
            if (testDef.type === TestType.class) {
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

        const tests = request.include
            .map((item) => this.testItemIndex.get(item.id))
            .filter((item): item is TestItem => item !== undefined);

        return tests.length > 0 ? tests : undefined;
    }

    findGroups(): string[] {
        return [...this.groupIndex.keys()].sort();
    }

    findTestsByGroup(group: string): TestItem[] {
        return [...(this.groupIndex.get(group) ?? [])];
    }

    getTrackedFiles() {
        return [...this.gatherFiles()];
    }

    reset() {
        for (const testData of this.testItems.values()) {
            for (const [testItem] of testData) {
                testItem.parent
                    ? testItem.parent.children.delete(testItem.id)
                    : this.rootItems.delete(testItem.id);
            }
        }
        this.testDefinitionIndex.clear();
        this.testItemIndex.clear();
        this.groupIndex.clear();

        return super.reset();
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(this.ctrl, testParser, this.rootItems);
        await testParser.parseFile(uri.fsPath, testsuite);

        this.removeTestItems(uri);
        this.clearTestDefinitions(uri);
        for (const [testItem, testDef] of testHierarchyBuilder.get()) {
            this.setTestDefinition(uri, testItem, testDef);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.removeTestItems(file.uri);

        return super.deleteFile(file);
    }

    private setTestDefinition(uri: URI, testItem: TestItem, testDefinition: TestDefinition): void {
        this.getTestDefinitions(uri).set(testItem, testDefinition);
        this.testDefinitionIndex.set(testItem.id, testDefinition);
        this.testItemIndex.set(testItem.id, testItem);

        if (testDefinition.type === TestType.method) {
            for (const tag of testItem.tags ?? []) {
                if (tag.id.startsWith('group:')) {
                    const group = tag.id.slice(6);
                    if (!this.groupIndex.has(group)) {
                        this.groupIndex.set(group, new Set());
                    }
                    this.groupIndex.get(group)!.add(testItem);
                }
            }
        }
    }

    private clearTestDefinitions(uri: URI): void {
        const testData = this.getTestDefinitions(uri);
        for (const [testItem] of testData) {
            this.testDefinitionIndex.delete(testItem.id);
            this.testItemIndex.delete(testItem.id);
            for (const group of this.groupIndex.values()) {
                group.delete(testItem);
            }
        }
        // Clean up empty groups
        for (const [key, items] of this.groupIndex) {
            if (items.size === 0) {
                this.groupIndex.delete(key);
            }
        }
        testData.clear();
    }

    private getTestDefinitions(uri: URI) {
        if (!this.testItems.has(uri.toString())) {
            this.testItems.set(uri.toString(), new Map<TestItem, TestDefinition>());
        }

        return this.testItems.get(uri.toString())!;
    }

    private inRangeTestItems(uri: URI, position: Position) {
        const items: TestItem[] = [];
        for (const [testItem, testDef] of this.getTestDefinitions(uri)) {
            if (
                (testDef.type === TestType.describe || testDef.type === TestType.method) &&
                position.line >= testItem.range!.start.line &&
                position.line <= testItem.range!.end.line
            ) {
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
