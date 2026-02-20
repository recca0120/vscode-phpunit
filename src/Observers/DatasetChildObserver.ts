import type { TestItem, TestRun } from 'vscode';
import type {
    TestDefinition,
    TestFailed,
    TestFinished,
    TestIgnored,
    TestRunnerObserver,
    TestStarted,
} from '../PHPUnit';
import type { TestCollection } from '../TestCollection/TestCollection';

const DATASET_PATTERN = /\swith\sdata\sset\s[#"].+$/;

export class DatasetChildObserver implements TestRunnerObserver {
    private testItemById: Map<string, TestItem>;

    constructor(
        private testCollection: TestCollection,
        queue: Map<TestDefinition, TestItem>,
        private testRun: TestRun,
    ) {
        this.testItemById = new Map([...queue.values()].map((item) => [item.id, item]));
    }

    testStarted(result: TestStarted): void {
        const child = this.findOrCreate(result);
        if (child) {
            this.testRun.started(child);
        }
    }

    testFinished(result: TestFinished): void {
        const child = this.findOrCreate(result);
        if (child) {
            this.testRun.passed(child);
        }
    }

    testFailed(result: TestFailed): void {
        const child = this.findOrCreate(result);
        if (child) {
            this.testRun.failed(child, [], result.duration);
        }
    }

    testIgnored(result: TestIgnored): void {
        const child = this.findOrCreate(result);
        if (child) {
            this.testRun.skipped(child);
        }
    }

    private findOrCreate(result: { id?: string; name: string }): TestItem | undefined {
        const datasetMatch = result.name.match(DATASET_PATTERN);
        if (!datasetMatch || !result.id) {
            return undefined;
        }

        const parent = this.testItemById.get(result.id);
        if (!parent) {
            return undefined;
        }

        const datasetSuffix = datasetMatch[0].trimStart();

        return this.testCollection.addDatasetChild(parent, datasetSuffix);
    }
}
