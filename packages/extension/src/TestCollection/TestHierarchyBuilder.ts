import {
    TestHierarchyBuilder as BaseTestHierarchyBuilder,
    type PHPUnitXML,
    type TestDefinition,
} from '@vscode-phpunit/phpunit';
import {
    Position,
    Range,
    type TestController,
    type TestItem,
    type TestItemCollection,
    TestTag,
    Uri,
} from 'vscode';

export { icon } from '@vscode-phpunit/phpunit';

export class TestHierarchyBuilder extends BaseTestHierarchyBuilder<TestItem> {
    private ctrl: TestController;

    constructor(
        ctrl: TestController,
        rootItems: TestItemCollection = ctrl.items,
        phpUnitXML?: PHPUnitXML,
    ) {
        super(rootItems, phpUnitXML);
        this.ctrl = ctrl;
    }

    protected createItem(id: string, label: string, uri?: string): TestItem {
        return this.ctrl.createTestItem(id, label, uri ? Uri.file(uri) : undefined);
    }

    protected createTag(id: string): TestTag {
        return new TestTag(id);
    }

    protected createRange(def: TestDefinition) {
        return new Range(
            new Position((def.start?.line ?? 1) - 1, def.start?.character ?? 0),
            new Position((def.end?.line ?? 1) - 1, def.end?.character ?? 0),
        );
    }
}
