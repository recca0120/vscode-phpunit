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
        this.doRun(result, (test) => this.testRun.started(test), true);
    }

    testStarted(result: TestStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test, result.duration));
    }

    testFailed(result: TestFailed): void {
        this.doRun(result, (test) =>
            this.testRun.failed(test, this.message(result, test), result.duration),
        );
    }

    testIgnored(result: TestIgnored): void {
        this.doRun(result, (test) => this.testRun.skipped(test));
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test), true);
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

    private doRun(
        result: TestResult,
        updateTestRun: (testItem: TestItem) => void,
        usePrefixFallback = false,
    ) {
        const testItem = this.find(result, usePrefixFallback);
        if (!testItem) {
            return;
        }

        updateTestRun(testItem);
    }

    private find(result: TestResult, usePrefixFallback = false) {
        if (!('id' in result) || typeof result.id !== 'string') {
            return undefined;
        }

        const exact = this.testItemById.get(result.id);
        if (exact) {
            return exact;
        }

        // Pest v3 has a bug: Str::beforeLast uses mb_strrpos (char offset) with substr (byte offset).
        // The → character (U+2192) is 3 UTF-8 bytes but 1 char, so testSuiteStarted/Finished names
        // are truncated by 2 bytes per → character. The truncated ID is a prefix of the full parent ID.
        // Only apply to suite events to avoid false positives on regular test events.
        if (
            usePrefixFallback &&
            result.id.includes('\u2192') &&
            !result.id.includes(' with data set ')
        ) {
            for (const [key, item] of this.testItemById) {
                if (key.startsWith(result.id) && !key.includes(' with data set ')) {
                    return item;
                }
            }
        }

        return undefined;
    }
}
