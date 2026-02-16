import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestMessage, type TestItem, type TestRun } from 'vscode';
import type { TestDefinition, TestFailed } from '../PHPUnit';
import { TestResultObserver } from './TestResultObserver';

function createTestItem(overrides: Partial<TestItem> = {}): TestItem {
    return {
        id: 'Tests\\ExampleTest::test_example',
        label: 'test_example',
        uri: { fsPath: '/project/tests/ExampleTest.php' } as any,
        range: { start: { line: 5 }, end: { line: 10 } } as any,
        children: { size: 0 } as any,
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
    } as any;
}

function createTestFailed(overrides: Partial<TestFailed> = {}): TestFailed {
    return {
        event: 'testFailed' as any,
        id: 'Tests\\ExampleTest::test_example',
        testId: 'Tests\\ExampleTest::test_example',
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
        observer = new TestResultObserver(queue, testRun);
        testItem = createTestItem();
        queue.set({} as TestDefinition, testItem);
    });

    it('should use TestMessage.diff when expected and actual are present', () => {
        const diffSpy = vi.spyOn(TestMessage, 'diff');

        observer.testFailed(createTestFailed({
            expected: 'true',
            actual: 'false',
            type: 'comparisonFailure',
        }));

        expect(diffSpy).toHaveBeenCalledWith('Failed asserting that false is true.', 'true', 'false');
        diffSpy.mockRestore();
    });

    it('should not use TestMessage.diff when expected/actual are missing', () => {
        const diffSpy = vi.spyOn(TestMessage, 'diff');

        observer.testFailed(createTestFailed({
            expected: undefined,
            actual: undefined,
        }));

        expect(diffSpy).not.toHaveBeenCalled();
        expect(testRun.failed).toHaveBeenCalled();
        diffSpy.mockRestore();
    });
});
