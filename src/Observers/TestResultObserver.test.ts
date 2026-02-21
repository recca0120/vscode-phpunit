import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    type TestController,
    type TestItem,
    TestMessage,
    type TestRun,
    TestRunRequest,
    tests,
    Uri,
} from 'vscode';
import type { TeamcityEvent, TestDefinition, TestFailed } from '../PHPUnit';
import { TestResultObserver } from './TestResultObserver';

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
    let ctrl: TestController;
    let queue: Map<TestDefinition, TestItem>;
    let testRun: TestRun;
    let observer: TestResultObserver;
    let testItem: TestItem;

    beforeEach(() => {
        ctrl = tests.createTestController('phpunit', 'PHPUnit');
        testRun = ctrl.createTestRun(new TestRunRequest());
        testItem = ctrl.createTestItem(
            'Tests\\ExampleTest::test_example',
            'test_example',
            Uri.file('/project/tests/ExampleTest.php'),
        );
        queue = new Map();
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

    it('should skip dataset results (handled by DatasetChildObserver)', () => {
        observer.testStarted({
            event: 'testStarted' as unknown as TeamcityEvent,
            id: 'Tests\\ExampleTest::test_example',
            name: 'test_example with data set #0',
            flowId: 1,
        } as never);

        expect(testRun.started).not.toHaveBeenCalled();
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
