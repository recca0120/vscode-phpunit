import type { TestItem, TestRun } from 'vscode';
import {
    resolveDatasetDefinition,
    type TestDefinition,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestRunnerObserver,
    type TestStarted,
} from '../PHPUnit';
import type { TestCollection } from '../TestCollection/TestCollection';

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
        if (!result.id) {
            return undefined;
        }

        const parent = this.testItemById.get(result.id);
        if (!parent) {
            return undefined;
        }

        const parentDef = this.testCollection.getTestDefinition(parent);
        if (!parentDef) {
            return undefined;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef) {
            return undefined;
        }

        return this.testCollection.addDatasetChild(parent, childDef);
    }
}
