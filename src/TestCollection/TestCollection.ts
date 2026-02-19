import { inject, injectable } from 'inversify';
import type {
    Position,
    TestController,
    TestItem,
    TestItemCollection,
    TestRunRequest,
    Uri,
} from 'vscode';
import type { URI } from 'vscode-uri';
import {
    TestCollection as BaseTestCollection,
    type ChangeResult,
    type File,
    PHPUnitXML,
    type TestDefinition,
    TestParser,
    TestType,
} from '../PHPUnit';
import { ClassHierarchy } from '../PHPUnit/TestParser/ClassHierarchy';
import { TYPES } from '../types';
import { TestDefinitionIndex } from './TestDefinitionIndex';
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection {
    private readonly index = new TestDefinitionIndex();
    private _rootItems: TestItemCollection | undefined;
    private readonly base: BaseTestCollection;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TestParser) testParser: TestParser,
        @inject(ClassHierarchy) classHierarchy: ClassHierarchy,
    ) {
        this.base = new BaseTestCollection(phpUnitXML, testParser, classHierarchy);
    }

    get rootItems(): TestItemCollection {
        return this._rootItems ?? this.ctrl.items;
    }

    setRootItems(items: TestItemCollection | undefined): void {
        this._rootItems = items;
    }

    createFolderRoot(folder: { index: number; name: string; uri: Uri }): TestItem {
        const id = `folder:${folder.uri.toString()}`;
        const folderItem = this.ctrl.createTestItem(
            id,
            `${icon(TestType.workspace)} ${folder.name}`,
            folder.uri,
        );
        folderItem.sortText = String(folder.index).padStart(5, '0');
        folderItem.canResolveChildren = true;
        this._rootItems = folderItem.children;
        this.registerTestDefinition(folderItem, {
            type: TestType.workspace,
            id,
            label: folder.name,
        });

        return folderItem;
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
        return [...this.base.gatherFiles()];
    }

    async add(uri: URI) {
        if (this.base.has(uri)) {
            return;
        }
        await this.change(uri);
    }

    async change(uri: URI) {
        const result = await this.base.change(uri);
        this.applyChangeResult(result);
    }

    has(uri: URI) {
        return this.base.has(uri);
    }

    delete(uri: URI) {
        const file = this.base.delete(uri);
        if (file) {
            this.handleFileDeleted(file);
        }
    }

    reset() {
        this.handleReset();
        this.base.reset();
    }

    private applyChangeResult(result: ChangeResult) {
        for (const { uri, tests } of result.parsed) {
            this.handleTestsParsed(uri, tests);
        }
        for (const file of result.deleted) {
            this.handleFileDeleted(file);
        }
    }

    private registerTestDefinition(testItem: TestItem, testDefinition: TestDefinition): void {
        this.index.set(testItem.uri?.toString() ?? testItem.id, testItem, testDefinition);
    }

    private handleTestsParsed(uri: URI, tests: TestDefinition[]) {
        this.removeTestItems(uri);
        this.index.deleteByUri(uri.toString());

        const builder = new TestHierarchyBuilder(this.ctrl, this.rootItems, this.phpUnitXML);
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

        for (const [testItem] of this.index.getDefinitionsByType(TestType.class)) {
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
}
