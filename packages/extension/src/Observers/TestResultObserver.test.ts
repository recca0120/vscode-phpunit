import type {
    TeamcityEvent,
    TestDefinition,
    TestFailed,
    TestFinished,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
} from '@vscode-phpunit/phpunit';
import { AliasMap, TestOutputParser } from '@vscode-phpunit/phpunit';
import { phpUnitProjectWin } from '@vscode-phpunit/phpunit/testing';
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

function buildTestItemById(items: TestItem[]): AliasMap<TestItem> {
    return new AliasMap(items.map((item) => [item.id, item]));
}

function setupAssertionsFlow(
    ctrl: TestController,
    queue: Map<TestDefinition, TestItem>,
    testRun: TestRun,
    flowId: number,
    testName: string,
) {
    const parser = new TestOutputParser();
    const file = phpUnitProjectWin('tests/AssertionsTest.php');

    const suiteStarted = parser.parse(
        `##teamcity[testSuiteStarted name='Recca0120\\VSCode\\Tests\\AssertionsTest' locationHint='php_qn://${file}::\\Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='${flowId}']`,
    ) as TestSuiteStarted;
    const childStarted = parser.parse(
        `##teamcity[testStarted name='${testName}' locationHint='php_qn://${file}::\\Recca0120\\VSCode\\Tests\\AssertionsTest::${testName}' flowId='${flowId}']`,
    ) as TestStarted;

    const suiteItem = ctrl.createTestItem(suiteStarted.id, 'AssertionsTest', Uri.file(file));
    const childItem = ctrl.createTestItem(childStarted.id, testName, Uri.file(file));
    suiteItem.children.add(childItem);

    const obs = new TestResultObserver(queue, testRun, buildTestItemById([suiteItem, childItem]));

    obs.testSuiteStarted(suiteStarted);
    obs.testStarted(childStarted);

    const finishSuite = () =>
        obs.testSuiteFinished(
            parser.parse(
                `##teamcity[testSuiteFinished name='Recca0120\\VSCode\\Tests\\AssertionsTest' flowId='${flowId}']`,
            ) as TestSuiteFinished,
        );

    return { parser, obs, suiteItem, childItem, flowId, testName, finishSuite };
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
        const testItemById = buildTestItemById([testItem]);
        observer = new TestResultObserver(queue, testRun, testItemById);
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

    it('should skip dataset results when no matching item exists', () => {
        observer.testStarted({
            event: 'testStarted' as unknown as TeamcityEvent,
            id: 'Tests\\ExampleTest::test_example with data set #0',
            name: 'test_example with data set #0',
            flowId: 1,
        } as never);

        expect(testRun.started).not.toHaveBeenCalled();
    });

    it('should match dataset result when dataset child item exists in shared map', () => {
        const datasetItem = ctrl.createTestItem(
            'Tests\\ExampleTest::test_example with data set #0',
            'with data set #0',
            Uri.file('/project/tests/ExampleTest.php'),
        );
        const testItemById = buildTestItemById([testItem, datasetItem]);
        const datasetObserver = new TestResultObserver(queue, testRun, testItemById);

        datasetObserver.testStarted({
            event: 'testStarted' as unknown as TeamcityEvent,
            id: 'Tests\\ExampleTest::test_example with data set #0',
            name: 'test_example with data set #0',
            flowId: 1,
        } as never);

        expect(testRun.started).toHaveBeenCalledWith(datasetItem);
    });

    it('should match dataset child added dynamically by DatasetObserver', () => {
        const testItemById = buildTestItemById([testItem]);
        const dynamicObserver = new TestResultObserver(queue, testRun, testItemById);

        // Simulate DatasetObserver adding a child to the shared map
        const datasetItem = ctrl.createTestItem(
            'Tests\\ExampleTest::test_example with data set #0',
            'with data set #0',
            Uri.file('/project/tests/ExampleTest.php'),
        );
        testItemById.set(datasetItem.id, datasetItem);

        dynamicObserver.testStarted({
            event: 'testStarted' as unknown as TeamcityEvent,
            id: 'Tests\\ExampleTest::test_example with data set #0',
            name: 'test_example with data set #0',
            flowId: 1,
        } as never);

        expect(testRun.started).toHaveBeenCalledWith(datasetItem);
    });

    it('should pass duration to testRun.passed', () => {
        observer.testFinished({
            event: 'testFinished' as unknown as TeamcityEvent,
            id: 'Tests\\ExampleTest::test_example',
            flowId: 1,
            name: 'test_example',
            file: '/project/tests/ExampleTest.php',
            locationHint: '',
            duration: 42,
        } as TestFinished);

        expect(testRun.passed).toHaveBeenCalledWith(testItem, 42);
    });

    it('should use 0-based line in message location', () => {
        observer.testFailed(
            createTestFailed({
                details: [
                    { file: '/project/tests/ExampleTest.php', line: 10 },
                    { file: '/project/tests/ExampleTest.php', line: 20 },
                ],
            }),
        );

        const failedCall = (testRun.failed as ReturnType<typeof vi.fn>).mock.calls[0];
        const message = failedCall[1];

        expect(message.location.range.start.line).toBe(9);
    });

    it('should use 0-based line in stackTrace position', () => {
        observer.testFailed(
            createTestFailed({
                details: [
                    { file: '/project/tests/ExampleTest.php', line: 10 },
                    { file: '/project/tests/ExampleTest.php', line: 20 },
                ],
            }),
        );

        const failedCall = (testRun.failed as ReturnType<typeof vi.fn>).mock.calls[0];
        const message = failedCall[1];

        expect(message.stackTrace).toHaveLength(1);
        expect(message.stackTrace[0].position.line).toBe(19);
    });

    it('should keep cross-file stackTrace frame when arch() test fails on a different file', () => {
        observer.testFailed(
            createTestFailed({
                file: '/project/tests/Unit/ArchTest.php',
                details: [{ file: '/project/src/Calculator.php', line: 7 }],
            }),
        );

        const failedCall = (testRun.failed as ReturnType<typeof vi.fn>).mock.calls[0];
        const message = failedCall[1];

        expect(message.stackTrace).toHaveLength(1);
        expect(message.stackTrace[0].uri.fsPath).toBe('/project/src/Calculator.php');
        expect(message.stackTrace[0].position.line).toBe(6);
    });

    it('should not set location when result.file is undefined', () => {
        observer.testFailed(
            createTestFailed({
                file: undefined as unknown as string,
                details: [{ file: '/project/tests/ExampleTest.php', line: 10 }],
            }),
        );

        const failedCall = (testRun.failed as ReturnType<typeof vi.fn>).mock.calls[0];
        const message = failedCall[1];

        expect(message.location).toBeUndefined();
        expect(message.stackTrace).toBeUndefined();
    });

    // Pest v3 bug: Str::beforeLast uses mb_strrpos (char offset) with substr (byte offset).
    // The → character (U+2192) is 3 UTF-8 bytes but 1 char, so testSuiteStarted/Finished names
    // are truncated by 2 bytes per → character.
    // AliasMap automatically registers truncated aliases on set().
    it('should find parent item via truncated alias when Pest v3 truncates testSuiteStarted name', () => {
        const parentItem = ctrl.createTestItem(
            'tests/Unit/SampleTests.php::`something` \u2192 it should detect OK but does not',
            'it should detect OK but does not',
            Uri.file('/project/tests/SampleTests.php'),
        );
        const obs = new TestResultObserver(
            queue,
            testRun,
            buildTestItemById([testItem, parentItem]),
        );

        obs.testSuiteStarted({
            event: 'testSuiteStarted' as unknown as TeamcityEvent,
            id: 'tests/Unit/SampleTests.php::`something` \u2192 it should detect OK but does n',
            flowId: 1,
            name: '`something` \u2192 it should detect OK but does n',
        } as unknown as TestSuiteStarted);

        expect(testRun.started).toHaveBeenCalledWith(parentItem);
    });

    it('should mark parent passed via truncated alias when Pest v3 truncates testSuiteFinished name', () => {
        const parentItem = ctrl.createTestItem(
            'tests/Unit/SampleTests.php::`something` \u2192 it should detect OK but does not',
            'it should detect OK but does not',
            Uri.file('/project/tests/SampleTests.php'),
        );
        const obs = new TestResultObserver(
            queue,
            testRun,
            buildTestItemById([testItem, parentItem]),
        );

        obs.testSuiteFinished({
            event: 'testSuiteFinished' as unknown as TeamcityEvent,
            id: 'tests/Unit/SampleTests.php::`something` \u2192 it should detect OK but does n',
            flowId: 1,
            name: '`something` \u2192 it should detect OK but does n',
        } as unknown as TestSuiteFinished);

        expect(testRun.passed).toHaveBeenCalledWith(parentItem);
    });

    it('should not match arch test item when runtime id differs from truncated alias', () => {
        const parentItem = ctrl.createTestItem(
            'tests/Unit/ArchTest.php::preset  \u2192 php ',
            'preset  \u2192 php ',
            Uri.file('/project/tests/ArchTest.php'),
        );
        const obs = new TestResultObserver(
            queue,
            testRun,
            buildTestItemById([testItem, parentItem]),
        );

        // truncated alias = 'tests/Unit/ArchTest.php::preset  → p'
        // runtime id = 'tests/Unit/ArchTest.php::preset  → php' — different, should not match
        obs.testStarted({
            event: 'testStarted' as unknown as TeamcityEvent,
            id: 'tests/Unit/ArchTest.php::preset  \u2192 php',
            flowId: 1,
            name: 'preset  \u2192 php',
        } as never);

        expect(testRun.started).not.toHaveBeenCalledWith(parentItem);
    });

    it('should mark suite as failed when TestSuiteFinished reports a failed count', () => {
        observer.testSuiteFinished({
            event: 'testSuiteFinished' as unknown as TeamcityEvent,
            id: testItem.id,
            flowId: 1,
            name: 'test_example',
            passed: 0,
            failed: 1,
            skipped: 0,
        } as unknown as TestSuiteFinished);

        expect(testRun.passed).not.toHaveBeenCalledWith(testItem);
        expect(testRun.failed).toHaveBeenCalledWith(testItem, expect.anything());
    });

    it('should mark suite as passed when TestSuiteFinished reports no failures', () => {
        observer.testSuiteFinished({
            event: 'testSuiteFinished' as unknown as TeamcityEvent,
            id: testItem.id,
            flowId: 1,
            name: 'test_example',
            passed: 2,
            failed: 0,
            skipped: 1,
        } as unknown as TestSuiteFinished);

        expect(testRun.failed).not.toHaveBeenCalledWith(testItem, expect.anything());
        expect(testRun.passed).toHaveBeenCalledWith(testItem);
    });

    it('flows a failing child test through TestOutputParser into a failed suite TestItem end-to-end', () => {
        const { parser, obs, suiteItem, flowId, testName, finishSuite } = setupAssertionsFlow(
            ctrl,
            queue,
            testRun,
            42,
            'test_is_not_same',
        );

        parser.parse(
            `##teamcity[testFailed name='${testName}' message='Failed asserting that two arrays are identical.' details='' duration='0' flowId='${flowId}']`,
        );
        const childFinished = parser.parse(
            `##teamcity[testFinished name='${testName}' duration='0' flowId='${flowId}']`,
        ) as TestFailed;
        obs.testFailed(childFinished);

        finishSuite();

        expect(testRun.failed).toHaveBeenCalledWith(suiteItem, []);
        expect(testRun.passed).not.toHaveBeenCalledWith(suiteItem);
    });

    it('flows an all-passing suite through TestOutputParser into a passed suite TestItem end-to-end', () => {
        const { parser, obs, suiteItem, flowId, testName, finishSuite } = setupAssertionsFlow(
            ctrl,
            queue,
            testRun,
            43,
            'test_passed',
        );

        const childFinished = parser.parse(
            `##teamcity[testFinished name='${testName}' duration='0' flowId='${flowId}']`,
        ) as TestFinished;
        obs.testFinished(childFinished);

        finishSuite();

        expect(testRun.failed).not.toHaveBeenCalledWith(suiteItem, expect.anything());
        expect(testRun.passed).toHaveBeenCalledWith(suiteItem);
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

    describe('Pest ->only() pending test cleanup on done()', () => {
        function buildQueueWithOnlySibling() {
            const file = '/project/tests/OnlyTest.php';
            const onlyItem = ctrl.createTestItem(
                'Tests\\OnlyTest::it is the only one',
                'it is the only one',
                Uri.file(file),
            );
            const otherItem = ctrl.createTestItem(
                'Tests\\OnlyTest::it never runs',
                'it never runs',
                Uri.file(file),
            );

            const localQueue = new Map<TestDefinition, TestItem>();
            localQueue.set({ file, annotations: { only: true } } as TestDefinition, onlyItem);
            localQueue.set({ file, annotations: {} } as TestDefinition, otherItem);

            const testItemById = buildTestItemById([onlyItem, otherItem]);
            const obs = new TestResultObserver(localQueue, testRun, testItemById);

            return { obs, onlyItem, otherItem };
        }

        it('marks non-only tests left pending in the same file as skipped when done() is called', () => {
            const { obs, otherItem } = buildQueueWithOnlySibling();

            obs.done();

            expect(testRun.skipped).toHaveBeenCalledWith(otherItem);
        });

        it('does not mark the only-flagged test itself as skipped', () => {
            const { obs, onlyItem } = buildQueueWithOnlySibling();

            obs.done();

            expect(testRun.skipped).not.toHaveBeenCalledWith(onlyItem);
        });

        it('does not skip a test that already reported a result before done()', () => {
            const { obs, otherItem } = buildQueueWithOnlySibling();

            obs.testFinished({
                event: 'testFinished' as unknown as TeamcityEvent,
                id: 'Tests\\OnlyTest::it never runs',
                flowId: 1,
                name: 'it never runs',
                file: '/project/tests/OnlyTest.php',
                locationHint: '',
                duration: 1,
            } as TestFinished);

            obs.done();

            expect(testRun.skipped).not.toHaveBeenCalledWith(otherItem);
        });

        it('does not skip anything when no test in the file is marked only', () => {
            const file = '/project/tests/PlainTest.php';
            const item = ctrl.createTestItem(
                'Tests\\PlainTest::it does something',
                'it does something',
                Uri.file(file),
            );
            const localQueue = new Map<TestDefinition, TestItem>();
            localQueue.set({ file, annotations: {} } as TestDefinition, item);
            const obs = new TestResultObserver(localQueue, testRun, buildTestItemById([item]));

            obs.done();

            expect(testRun.skipped).not.toHaveBeenCalledWith(item);
        });
    });
});
