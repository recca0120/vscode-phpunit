import type {
    TestDefinition,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestResult,
    TestRunnerObserver,
    TestStarted,
    TestSuiteFinished,
    TestSuiteStarted,
} from '@vscode-phpunit/phpunit';
import {
    Location,
    Position,
    Range,
    type TestItem,
    TestMessage,
    TestMessageStackFrame,
    type TestRun,
} from 'vscode';
import { URI } from 'vscode-uri';

export class TestResultObserver implements TestRunnerObserver {
    private readonly completedItems = new Set<string>();
    private readonly failedItems = new Set<string>();
    private readonly parentMarked = new Set<string>();

    constructor(
        private queue: Map<TestDefinition, TestItem>,
        private testRun: TestRun,
        private testItemById: Map<string, TestItem>,
    ) {}

    abort(): void {
        for (const testItem of this.queue.values()) {
            this.testRun.skipped(testItem);
        }
    }

    done(): void {
        this.testRun.end();
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.doRun(result, (test) => {
            this.parentMarked.add(test.id);
            this.testRun.started(test);
        });
    }

    testStarted(result: TestStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestFinished): void {
        this.doRun(result, (test) => {
            this.testRun.passed(test, result.duration);
            this.completedItems.add(test.id);
            this.propagateToParent(test);
        });
    }

    testFailed(result: TestFailed): void {
        this.doRun(result, (test) => {
            this.testRun.failed(test, this.message(result, test), result.duration);
            this.completedItems.add(test.id);
            this.failedItems.add(test.id);
            this.propagateToParent(test);
        });
    }

    testIgnored(result: TestIgnored): void {
        this.doRun(result, (test) => {
            this.testRun.skipped(test);
            this.completedItems.add(test.id);
            this.propagateToParent(test);
        });
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.doRun(result, (test) => {
            this.parentMarked.add(test.id);
            this.testRun.passed(test);
        });
    }

    private propagateToParent(test: TestItem): void {
        const parent = test.parent;
        if (!parent || this.parentMarked.has(parent.id)) {
            return;
        }

        const trackedChildren = [...parent.children]
            .map(([, child]) => child)
            .filter((child) => this.testItemById.has(child.id));

        if (
            trackedChildren.length === 0 ||
            trackedChildren.some((child) => !this.completedItems.has(child.id))
        ) {
            return;
        }

        this.parentMarked.add(parent.id);
        if (trackedChildren.some((child) => this.failedItems.has(child.id))) {
            this.testRun.failed(
                parent,
                new TestMessage('One or more dataset entries failed'),
                undefined,
            );
        } else {
            this.testRun.passed(parent, undefined);
        }
    }

    private message(result: TestFailed | TestIgnored, test: TestItem) {
        const message =
            result.expected !== undefined && result.actual !== undefined
                ? TestMessage.diff(result.message, result.expected, result.actual)
                : new TestMessage(result.message);

        const details = result.details;
        const resultFile = result.file;
        if (details.length === 0 || !test.uri || !resultFile) {
            return message;
        }

        const matchingDetail = details.find(({ file }) => file === resultFile);
        const line = matchingDetail ? matchingDetail.line - 1 : (test.range?.start.line ?? 0);

        message.location = new Location(
            test.uri,
            new Range(new Position(line, 0), new Position(line, 0)),
        );

        message.stackTrace = details
            .filter(
                ({ file, line }) =>
                    file === resultFile && (!matchingDetail || line !== matchingDetail.line),
            )
            .map(
                ({ file, line }) =>
                    new TestMessageStackFrame(
                        `${file}:${line}`,
                        URI.file(file),
                        new Position(line - 1, 0),
                    ),
            );

        return message;
    }

    private doRun(result: TestResult, updateTestRun: (testItem: TestItem) => void) {
        const testItem = this.find(result);
        if (!testItem) {
            return;
        }

        updateTestRun(testItem);
    }

    private find(result: TestResult) {
        if (!('id' in result) || typeof result.id !== 'string') {
            return undefined;
        }

        return this.testItemById.get(result.id);
    }
}
