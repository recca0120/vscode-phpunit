import {
    isThrowableFailure,
    type TestDefinition,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestResult,
    type TestRunnerObserver,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
} from '@vscode-phpunit/phpunit';
import {
    Location,
    Position,
    Range,
    type TestItem,
    TestMessage,
    TestMessageStackFrame,
    type TestRun,
    Uri,
} from 'vscode';
import { URI } from 'vscode-uri';

export class TestResultObserver implements TestRunnerObserver {
    private reportedIds = new Set<string>();

    constructor(
        private queue: Map<TestDefinition, TestItem>,
        private testRun: TestRun,
        private testItemById: Map<string, TestItem>,
    ) {}

    abort(): void {
        for (const testItem of this.queue.values()) {
            if (this.reportedIds.has(testItem.id)) {
                continue;
            }
            this.testRun.skipped(testItem);
        }
    }

    done(): void {
        this.skipPestTestsShadowedByOnly();
        this.testRun.end();
    }

    testSuiteStarted(result: TestSuiteStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testStarted(result: TestStarted): void {
        this.doRun(result, (test) => this.testRun.started(test));
    }

    testFinished(result: TestFinished): void {
        this.doRun(result, (test) => this.testRun.passed(test, result.duration), {
            markAsReported: true,
        });
    }

    testFailed(result: TestFailed): void {
        const report = isThrowableFailure(result) ? this.testRun.errored : this.testRun.failed;
        this.doRun(
            result,
            (test) => report.call(this.testRun, test, this.message(result, test), result.duration),
            { markAsReported: true },
        );
    }

    testIgnored(result: TestIgnored): void {
        this.doRun(result, (test) => this.testRun.skipped(test), { markAsReported: true });
    }

    testSuiteFinished(result: TestSuiteFinished): void {
        this.doRun(
            result,
            (test) => {
                if (result.failed > 0) {
                    this.testRun.failed(test, []);
                    return;
                }

                this.testRun.passed(test);
            },
            { markAsReported: true },
        );
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
            matchingDetail ? Uri.file(matchingDetail.file) : test.uri,
            new Range(new Position(line, 0), new Position(line, 0)),
        );

        message.stackTrace = details
            .filter(
                ({ file, line }) =>
                    !matchingDetail || file !== matchingDetail.file || line !== matchingDetail.line,
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
        { markAsReported = false }: { markAsReported?: boolean } = {},
    ) {
        const testItem = this.find(result);
        if (!testItem) {
            return;
        }

        if (markAsReported) {
            this.reportedIds.add(testItem.id);
        }

        updateTestRun(testItem);
    }

    private find(result: TestResult) {
        if (!('id' in result) || typeof result.id !== 'string') {
            return undefined;
        }

        return this.testItemById.get(result.id);
    }

    private skipPestTestsShadowedByOnly(): void {
        const filesWithOnly = new Set(
            [...this.queue.keys()]
                .filter((testDef) => testDef.annotations?.only && testDef.file)
                .map((testDef) => testDef.file),
        );
        if (filesWithOnly.size === 0) {
            return;
        }

        for (const [testDef, testItem] of this.queue) {
            if (testDef.annotations?.only) {
                continue;
            }
            if (!testDef.file || !filesWithOnly.has(testDef.file)) {
                continue;
            }
            if (this.reportedIds.has(testItem.id)) {
                continue;
            }

            this.testRun.skipped(testItem);
            this.testRun.appendOutput(
                'Skipped: another test in this file is marked with ->only(), ' +
                    'so this test did not run.\r\n',
                undefined,
                testItem,
            );
        }
    }
}
