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
import {
    EOL,
    PestV2Fixer,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestResult,
    type TestRunnerObserver,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
} from '../PHPUnit';
import type { TestDefinition } from '../PHPUnit';

export class TestResultObserver implements TestRunnerObserver {
    constructor(
        private queue: Map<TestDefinition, TestItem>,
        private testRun: TestRun,
    ) {}

    line(line: string): void {
        this.testRun.appendOutput(`${line}${EOL}`);
    }

    error(error: string): void {
        this.testRun.appendOutput(error);
    }

    abort(): void {
        this.queue.forEach((testItem) => this.testRun.skipped(testItem));
    }

    done(): void {
        this.testRun.end();
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testStarted(result: TestStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test));
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
        this.doRun(result, (test) => this.testRun.passed(test));
    }

    private message(result: TestFailed | TestIgnored, test: TestItem) {
        const message = TestMessage.diff(result.message, result.expected!, result.actual!);
        const details = result.details;
        if (details.length > 0) {
            const matchingDetail = details.find(({ file }) => file.endsWith(result.file ?? ''));
            const line = matchingDetail ? matchingDetail.line - 1 : test.range!.start.line;

            message.location = new Location(
                test.uri!,
                new Range(new Position(line, 0), new Position(line, 0)),
            );

            message.stackTrace = details
                .filter(
                    ({ file, line }) =>
                        file.endsWith(result.file ?? '') && (!matchingDetail || line !== matchingDetail.line),
                )
                .map(
                    ({ file, line }) =>
                        new TestMessageStackFrame(
                            `${file}:${line}`,
                            URI.file(file),
                            new Position(line, 0),
                        ),
                );
        }

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
        if (!('id' in result)) {
            return undefined;
        }

        for (const testItem of this.queue.values()) {
            if (
                result.id === testItem.id ||
                PestV2Fixer.isEqualsPestV2DataSetId(result, testItem.id)
            ) {
                return testItem;
            }
        }

        return undefined;
    }
}
