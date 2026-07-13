import {
    TestHierarchyBuilder as BaseTestHierarchyBuilder,
    type PHPUnitXML,
    type TestDefinition,
    TestType,
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

const TEST_ICONS: Record<TestType, string> = {
    [TestType.workspace]: '$(folder)',
    [TestType.testsuite]: '$(symbol-namespace)',
    [TestType.namespace]: '$(symbol-namespace)',
    [TestType.class]: '$(symbol-class)',
    [TestType.method]: '$(symbol-method)',
    [TestType.describe]: '$(symbol-class)',
    [TestType.dataset]: '$(symbol-enum-member)',
};

export function icon(type: TestType): string {
    return TEST_ICONS[type] ?? '';
}

function resolveConditionalSkipDescription(conditionalSkip: 'onCi' | 'locally'): string {
    return conditionalSkip === 'onCi' ? 'skips on CI' : 'skips locally';
}

function resolveTodoDescription(
    annotations: NonNullable<TestDefinition['annotations']>,
): string | undefined {
    const parts: string[] = [];
    if (annotations.todoAssignee) {
        parts.push(`assigned: ${annotations.todoAssignee}`);
    }
    if (annotations.todoIssue) {
        parts.push(`issue #${annotations.todoIssue}`);
    }

    return parts.join(', ') || undefined;
}

// Order is priority: the first matching annotation wins when a test carries more than one
// (e.g. an ->only() test is never also shown as a plain browser test).
const ANNOTATION_ICONS: Array<[keyof NonNullable<TestDefinition['annotations']>, string]> = [
    ['only', '$(target)'],
    ['skipped', '$(circle-slash)'],
    ['todo', '$(issue-draft)'],
    ['conditionalSkip', '$(question)'],
    ['dataProvider', '$(symbol-enum)'],
    ['browserTest', '$(globe)'],
];

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

    protected override formatLabel(testDefinition: TestDefinition): string {
        const prefix = this.resolveIconPrefix(testDefinition);

        return prefix ? `${prefix} ${testDefinition.label}` : testDefinition.label;
    }

    protected override decorateItem(testItem: TestItem, testDefinition: TestDefinition): void {
        testItem.description = this.resolveDescription(testDefinition);
    }

    // The winning annotation for a test with multiple modifiers — same priority order
    // ANNOTATION_ICONS declares, shared by the icon and the description so they can
    // never disagree (e.g. ->skip()->skipOnCi() must not show "skips on CI" next to
    // an unconditional-skip icon).
    private resolveWinningAnnotation(
        testDefinition: TestDefinition,
    ): (typeof ANNOTATION_ICONS)[number] | undefined {
        if (testDefinition.type !== TestType.method) {
            return undefined;
        }

        const annotations = testDefinition.annotations;
        return ANNOTATION_ICONS.find(([key]) => annotations?.[key]);
    }

    private resolveIconPrefix(testDefinition: TestDefinition): string {
        return this.resolveWinningAnnotation(testDefinition)?.[1] ?? icon(testDefinition.type);
    }

    private resolveDescription(testDefinition: TestDefinition): string | undefined {
        const winningKey = this.resolveWinningAnnotation(testDefinition)?.[0];
        const annotations = testDefinition.annotations;

        if (winningKey === 'conditionalSkip' && annotations?.conditionalSkip) {
            return resolveConditionalSkipDescription(annotations.conditionalSkip);
        }
        if (annotations?.todo) {
            return resolveTodoDescription(annotations);
        }

        return undefined;
    }
}
