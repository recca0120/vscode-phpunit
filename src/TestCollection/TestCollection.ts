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
    TestParser,
    TestType,
} from '../PHPUnit';
import { ClassHierarchy } from '../PHPUnit/TestParser/ClassHierarchy';
import { TYPES } from '../types';
import { TestDefinitionIndex } from './TestDefinitionIndex';
import { TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection {
    private readonly index = new TestDefinitionIndex();
    private _rootItems: TestItemCollection | undefined;
    private readonly base: BaseTestCollection;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) phpUnitXML: PHPUnitXML,
        @inject(TestParser) testParser: TestParser,
        @inject(ClassHierarchy) classHierarchy: ClassHierarchy,
    ) {
        this.base = new BaseTestCollection(phpUnitXML, testParser, classHierarchy, {
            onTestsParsed: (uri, tests) => this.handleTestsParsed(uri, tests),
            onFileDeleted: (file) => this.handleFileDeleted(file),
            onReset: () => this.handleReset(),
        });
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

    registerTestDefinition(testItem: TestItem, testDefinition: TestDefinition): void {
        this.index.set(testItem.uri?.toString() ?? testItem.id, testItem, testDefinition);
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
        return [...this.base.gatherFiles()];
    }

    clearMatcherCache() {
        this.base.clearMatcherCache();
    }

    async add(uri: URI) {
        await this.base.add(uri);
        return this;
    }

    async change(uri: URI) {
        await this.base.change(uri);
        return this;
    }

    has(uri: URI) {
        return this.base.has(uri);
    }

    delete(uri: URI) {
        return this.base.delete(uri);
    }

    reset() {
        this.base.reset();
        return this;
    }

    private handleTestsParsed(uri: URI, tests: TestDefinition[]) {
        this.removeTestItems(uri);
        this.index.deleteByUri(uri.toString());

        const builder = new TestHierarchyBuilder(
            this.ctrl,
            this.rootItems,
            this.base.getPhpUnitXML(),
        );
        builder.build(tests);
        for (const [testItem, testDef] of builder.get()) {
            this.index.set(uri.toString(), testItem, testDef);
        }
    }

    private handleFileDeleted(file: File<TestDefinition>) {
        this.removeTestItems(file.uri);
        this.index.deleteByUri(file.uri.toString());
    }

    private handleReset() {
        const workspaceDefs = this.index.getDefinitionsByType(TestType.workspace);

        for (const [testItem, testDef] of this.allDefinitions()) {
            if (testDef.type !== TestType.class) {
                continue;
            }

            if (!testItem.parent) {
                this.rootItems.delete(testItem.id);
                continue;
            }

            testItem.parent.children.delete(testItem.id);
        }
        this.index.clear();

        for (const [testItem, testDef] of workspaceDefs) {
            this.index.set(testItem.uri?.toString() ?? testItem.id, testItem, testDef);
        }
    }

    private inRangeTestItems(uri: URI, position: Position) {
        const items: TestItem[] = [];
        for (const [testItem, testDef] of this.index.getDefinitionsByUri(uri.toString())) {
            if (testDef.type !== TestType.describe && testDef.type !== TestType.method) {
                continue;
            }

            if (
                !testItem.range ||
                position.line < testItem.range.start.line ||
                position.line > testItem.range.end.line
            ) {
                continue;
            }

            items.push(testItem);
        }
        items.sort((a, b) => this.compareFn(b, position) - this.compareFn(a, position));

        return items;
    }

    private compareFn(testItem: TestItem, position: Position) {
        return (testItem.range?.start.line ?? 0) - position.line;
    }

    private removeTestItems(uri: URI) {
        for (const testItem of this.findTestsByFile(uri)) {
            if (!testItem.parent) {
                this.rootItems.delete(testItem.id);
                continue;
            }
            this.pruneEmptyParents(testItem);
        }
    }

    private pruneEmptyParents(testItem: TestItem) {
        let current = testItem;
        while (current.parent) {
            const parent = current.parent;
            parent.children.delete(current.id);
            if (parent.children.size !== 0) {
                return;
            }

            current = parent;
            if (!current.parent || current.parent.children === this._rootItems) {
                this.rootItems.delete(current.id);
                return;
            }
        }
    }

    private *allDefinitions(): IterableIterator<[TestItem, TestDefinition]> {
        for (const file of this.base.gatherFiles()) {
            yield* this.index.getDefinitionsByUri(file.uri.toString());
        }
    }
}
