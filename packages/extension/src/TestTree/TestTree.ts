import {
    type IndexChange,
    type IndexedFile,
    PHPUnitXML,
    type TestDefinition,
    TestIndex,
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
import { icon, TestHierarchyBuilder } from './TestHierarchyBuilder';
import { TestItemRegistry } from './TestItemRegistry';

@injectable()
export class TestTree {
    private readonly registry = new TestItemRegistry();
    private _rootItems: TestItemCollection | undefined;

    constructor(
        @inject(TYPES.TestController) private ctrl: TestController,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TestIndex) private testIndex: TestIndex,
    ) {}

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
        this.registry.register(folderItem.uri?.toString() ?? folderItem.id, folderItem, {
            type: TestType.workspace,
            id,
            label: folder.name,
        });

        return folderItem;
    }

    definitionOf(testItem: TestItem): TestDefinition | undefined {
        return this.registry.definitionOf(testItem.id);
    }

    addDatasetChild(result: TestStarted): TestItem | undefined {
        const resolved = this.testIndex.addDatasetChild(result);
        if (!resolved) {
            return undefined;
        }
        return this.createDatasetItem(resolved.parentId, resolved.childDef);
    }

    private createDatasetItem(parentId: string, childDef: TestDefinition): TestItem | undefined {
        const existing = this.registry.itemOf(childDef.id);
        if (existing) {
            return existing;
        }

        const parentItem = this.registry.itemOf(parentId);
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
        this.registry.register(uri, childItem, childDef);

        return childItem;
    }

    itemsInFile(uri: URI): TestItem[] {
        const tests: TestItem[] = [];
        for (const [testItem, testDef] of this.registry.entriesIn(uri.toString())) {
            if (testDef.type === TestType.class) {
                tests.push(testItem);
            }
        }

        return tests;
    }

    itemsAt(uri: URI, position: Position): TestItem[] {
        const items = this.inRangeTestItems(uri, position);

        return items.length > 0 ? [items[0]] : this.itemsInFile(uri);
    }

    itemsOf(request?: TestRunRequest) {
        if (!request?.include) {
            return undefined;
        }

        const tests = request.include
            .map((item) => this.registry.itemOf(item.id))
            .filter((item): item is TestItem => item !== undefined);

        return tests.length > 0 ? tests : undefined;
    }

    groups(): string[] {
        return this.registry.groups();
    }

    itemsInGroup(group: string): TestItem[] {
        return this.registry.itemsInGroup(group);
    }

    has(uri: URI) {
        return this.testIndex.has(uri);
    }

    files() {
        return this.testIndex.files();
    }

    async add(uri: URI) {
        if (this.has(uri)) {
            return;
        }
        await this.update(uri);
    }

    async update(uri: URI) {
        const result = await this.testIndex.update(uri);
        this.applyIndexChange(result);
        return result;
    }

    async remove(uri: URI) {
        const change = await this.testIndex.remove(uri);
        this.applyIndexChange(change);
        return change.deleted.find((file) => file.uri.toString() === uri.toString());
    }

    clear() {
        this.handleReset();
        this.testIndex.clear();
    }

    private applyIndexChange(result: IndexChange) {
        for (const { uri, tests } of result.parsed) {
            this.handleTestsParsed(uri, tests);
            this.ctrl.invalidateTestResults(this.itemsInFile(uri));
        }
        for (const file of result.deleted) {
            this.handleFileDeleted(file);
        }
    }

    private handleTestsParsed(uri: URI, tests: TestDefinition[]) {
        for (const testItem of this.itemsInFile(uri)) {
            if (testItem.parent) {
                testItem.parent.children.delete(testItem.id);
            } else {
                this.rootItems.delete(testItem.id);
            }
        }
        this.registry.unregisterFile(uri.toString());

        const builder = new TestHierarchyBuilder(this.ctrl, this.rootItems, this.phpUnitXML);
        const testData = builder.build(tests);
        for (const [testItem, testDef] of testData) {
            this.registry.register(uri.toString(), testItem, testDef);
        }
    }

    private handleFileDeleted(file: IndexedFile<TestDefinition>) {
        for (const testItem of this.itemsInFile(file.uri)) {
            if (!testItem.parent) {
                this.rootItems.delete(testItem.id);
                continue;
            }
            this.pruneEmptyParents(testItem);
        }
        this.registry.unregisterFile(file.uri.toString());
    }

    private handleReset() {
        const workspaceDefs = this.registry.entriesOfType(TestType.workspace);

        const keepIds = new Set(workspaceDefs.map(([item]) => item.id));
        for (const [id] of this.rootItems) {
            if (!keepIds.has(id)) {
                this.rootItems.delete(id);
            }
        }
        this.registry.clear();

        for (const [testItem, testDef] of workspaceDefs) {
            this.registry.register(testItem.uri?.toString() ?? testItem.id, testItem, testDef);
        }
    }

    private inRangeTestItems(uri: URI, position: Position) {
        const items: TestItem[] = [];
        for (const [testItem, testDef] of this.registry.entriesIn(uri.toString())) {
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
