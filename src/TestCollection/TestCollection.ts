import { inject, injectable } from 'inversify';
import type {
    Position,
    TestController,
    TestItem,
    TestItemCollection,
    TestRunRequest,
} from 'vscode';
import type { URI } from 'vscode-uri';
import {
    TestCollection as BaseTestCollection,
    type File,
    PHPUnitXML,
    type TestDefinition,
    TestType,
} from '../PHPUnit';
import { TYPES } from '../types';
import { TestDefinitionIndex } from './TestDefinitionIndex';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection extends BaseTestCollection {
    private readonly index = new TestDefinitionIndex();
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
        return this.index.getDefinition(testItem.id);
    }

    findTestsByFile(uri: URI): TestItem[] {
        const tests: TestItem[] = [];
        for (const [testItem, testDef] of this.index.getDefinitionsByUri(uri.toString())) {
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
            .map((item) => this.index.getItem(item.id))
            .filter((item): item is TestItem => item !== undefined);

        return tests.length > 0 ? tests : undefined;
    }

    findGroups(): string[] {
        return this.index.getGroups();
    }

    findTestsByGroup(group: string): TestItem[] {
        return this.index.getItemsByGroup(group);
    }

    getTrackedFiles() {
        return [...this.gatherFiles()];
    }

    reset() {
        for (const [testItem, testDef] of this.allDefinitions()) {
            if (testDef.type === TestType.class) {
                testItem.parent
                    ? testItem.parent.children.delete(testItem.id)
                    : this.rootItems.delete(testItem.id);
            }
        }
        this.index.clear();

        return super.reset();
    }

    protected async parseTests(uri: URI, testsuite: string) {
        const { testParser, testDefinitionBuilder } = this.createTestParser();
        const testHierarchyBuilder = new TestHierarchyBuilder(
            this.ctrl,
            testParser,
            this.rootItems,
        );
        await testParser.parseFile(uri.fsPath, testsuite);

        this.removeTestItems(uri);
        this.index.deleteByUri(uri.toString());
        for (const [testItem, testDef] of testHierarchyBuilder.get()) {
            this.index.set(uri.toString(), testItem, testDef);
        }

        return testDefinitionBuilder.get();
    }

    protected deleteFile(file: File<TestDefinition>) {
        this.removeTestItems(file.uri);
        this.index.deleteByUri(file.uri.toString());

        return super.deleteFile(file);
    }

    private inRangeTestItems(uri: URI, position: Position) {
        const items: TestItem[] = [];
        for (const [testItem, testDef] of this.index.getDefinitionsByUri(uri.toString())) {
            if (
                (testDef.type === TestType.describe || testDef.type === TestType.method) &&
                testItem.range &&
                position.line >= testItem.range.start.line &&
                position.line <= testItem.range.end.line
            ) {
                items.push(testItem);
            }
        }
        items.sort((a, b) => this.compareFn(b, position) - this.compareFn(a, position));

        return items;
    }

    private compareFn(testItem: TestItem, position: Position) {
        return (testItem.range?.start.line ?? 0) - position.line;
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

    private *allDefinitions(): IterableIterator<[TestItem, TestDefinition]> {
        for (const file of this.gatherFiles()) {
            yield* this.index.getDefinitionsByUri(file.uri.toString());
        }
    }
}
