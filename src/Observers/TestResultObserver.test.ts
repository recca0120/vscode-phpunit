import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    type Range,
    type TestItem,
    type TestItemCollection,
    TestMessage,
    type TestRun,
    type Uri,
} from 'vscode';
import type { TeamcityEvent, TestDefinition, TestFailed } from '../PHPUnit';
import { TestResultObserver } from './TestResultObserver';

function createTestItem(overrides: Partial<TestItem> = {}): TestItem {
    return {
        id: 'Tests\\ExampleTest::test_example',
        label: 'test_example',
        uri: { fsPath: '/project/tests/ExampleTest.php' } as unknown as Uri,
        range: { start: { line: 5 }, end: { line: 10 } } as unknown as Range,
        children: { size: 0 } as unknown as TestItemCollection,
        ...overrides,
    } as TestItem;
}

function createTestRun(): TestRun & { failed: ReturnType<typeof vi.fn> } {
    return {
        appendOutput: vi.fn(),
        started: vi.fn(),
        passed: vi.fn(),
        failed: vi.fn(),
        skipped: vi.fn(),
        errored: vi.fn(),
        end: vi.fn(),
    } as unknown as TestRun & { failed: ReturnType<typeof vi.fn> };
}

function createTestFailed(overrides: Partial<TestFailed> = {}): TestFailed {
    return {
        event: 'testFailed' as unknown as TeamcityEvent,
        id: 'Tests\\ExampleTest::test_example',
        flowId: 1,
        name: 'test_example',
        file: '/project/tests/ExampleTest.php',
        locationHint: 'php_qn:///project/tests/ExampleTest.php::Tests\\ExampleTest::test_example',
        message: 'Failed asserting that false is true.',
        details: [],
        duration: 0.1,
        ...overrides,
    };
}

describe('TestResultObserver', () => {
    let queue: Map<TestDefinition, TestItem>;
    let testRun: ReturnType<typeof createTestRun>;
    let observer: TestResultObserver;
    let testItem: TestItem;

    beforeEach(() => {
        queue = new Map();
        testRun = createTestRun();
        testItem = createTestItem();
        queue.set({} as TestDefinition, testItem);
        observer = new TestResultObserver(queue, testRun);
    });

    it('should use TestMessage.diff when expected and actual are present', () => {
        const diffSpy = vi.spyOn(TestMessage, 'diff');

        observer.testFailed(
            createTestFailed({
                expected: 'true',
                actual: 'false',
                type: 'comparisonFailure',
            }),
        );

        expect(diffSpy).toHaveBeenCalledWith(
            'Failed asserting that false is true.',
            'true',
            'false',
        );
        diffSpy.mockRestore();
    });

    it('should not use TestMessage.diff when expected/actual are missing', () => {
        const diffSpy = vi.spyOn(TestMessage, 'diff');

        observer.testFailed(
            createTestFailed({
                expected: undefined,
                actual: undefined,
            }),
        );

        expect(diffSpy).not.toHaveBeenCalled();
        expect(testRun.failed).toHaveBeenCalled();
        diffSpy.mockRestore();
    });
});
