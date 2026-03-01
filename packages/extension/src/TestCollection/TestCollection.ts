import {
    TestCollection as BaseTestCollection,
    type ChangeResult,
    type File,
    PHPUnitXML,
    type TestDefinition,
    TestParser,
    type TestStarted,
    TestType,
} from '@vscode-phpunit/phpunit';
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
import { TYPES } from '../types';
import { TestDefinitionIndex } from './TestDefinitionIndex';
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';

@injectable()
export class TestCollection extends BaseTestCollection {
    private readonly index = new TestDefinitionIndex();
    private _rootItems: TestItemCollection | undefined;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) phpUnitXML: PHPUnitXML,
        @inject(TestParser) testParser: TestParser,
    ) {
        super(phpUnitXML, testParser);
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
        this.index.set(folderItem.uri?.toString() ?? folderItem.id, folderItem, {
            type: TestType.workspace,
            id,
            label: folder.name,
        });

        return folderItem;
    }

    getTestDefinition(testItem: TestItem): TestDefinition | undefined {
        return this.index.getDefinition(testItem.id);
    }

    resolveDatasetChild(result: TestStarted): TestItem | undefined {
        const resolved = super.resolveDataset(result);
        if (!resolved) {
            return undefined;
        }
        return this.addDatasetChild(resolved.parentId, resolved.childDef);
    }

    private addDatasetChild(parentId: string, childDef: TestDefinition): TestItem | undefined {
        const existing = this.index.getItem(childDef.id);
        if (existing) {
            return existing;
        }

        const parentItem = this.index.getItem(parentId);
        if (!parentItem) {
            return undefined;
        }

        const childItem = this.ctrl.createTestItem(
            childDef.id,
            `${icon(TestType.dataset)} ${childDef.label}`,
            parentItem.uri,
        );
        childItem.range = parentItem.range;
        parentItem.children.add(childItem);

        const uri = parentItem.uri?.toString() ?? parentItem.id;
        this.index.set(uri, childItem, childDef);

        return childItem;
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

    override async change(uri: URI) {
        const result = await super.change(uri);
        this.applyChangeResult(result);
        return result;
    }

    override delete(uri: URI) {
        const file = super.delete(uri);
        if (file) {
            this.handleFileDeleted(file);
        }
        return file;
    }

    override reset() {
        this.handleReset();
        super.reset();
    }

    private applyChangeResult(result: ChangeResult) {
        for (const { uri, tests } of result.parsed) {
            this.handleTestsParsed(uri, tests);
        }
        for (const file of result.deleted) {
            this.handleFileDeleted(file);
        }
    }

    private handleTestsParsed(uri: URI, tests: TestDefinition[]) {
        for (const testItem of this.findTestsByFile(uri)) {
            if (testItem.parent) {
                testItem.parent.children.delete(testItem.id);
            } else {
                this.rootItems.delete(testItem.id);
            }
        }
        this.index.deleteByUri(uri.toString());

        const builder = new TestHierarchyBuilder(this.ctrl, this.rootItems, this.phpUnitXML);
        const testData = builder.build(tests);
        for (const [testItem, testDef] of testData) {
            this.index.set(uri.toString(), testItem, testDef);
        }
    }

    private handleFileDeleted(file: File<TestDefinition>) {
        for (const testItem of this.findTestsByFile(file.uri)) {
            if (!testItem.parent) {
                this.rootItems.delete(testItem.id);
                continue;
            }
            this.pruneEmptyParents(testItem);
        }
        this.index.deleteByUri(file.uri.toString());
    }

    private handleReset() {
        const workspaceDefs = this.index.getDefinitionsByType(TestType.workspace);

        const keepIds = new Set(workspaceDefs.map(([item]) => item.id));
        for (const [id] of this.rootItems) {
            if (!keepIds.has(id)) {
                this.rootItems.delete(id);
            }
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
        items.sort((a, b) => (b.range?.start.line ?? 0) - (a.range?.start.line ?? 0));

        return items;
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
