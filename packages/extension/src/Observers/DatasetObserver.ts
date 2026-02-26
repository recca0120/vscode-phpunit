import type { TestRunnerObserver, TestStarted } from '@vscode-phpunit/phpunit';
import type { TestItem } from 'vscode';
import type { TestCollection } from '../TestCollection/TestCollection';

export class DatasetObserver implements TestRunnerObserver {
    constructor(
        private testCollection: TestCollection,
        private testItemById: Map<string, TestItem>,
    ) {}

    testStarted(result: TestStarted): void {
        const child = this.testCollection.resolveDatasetChild(result);
        if (child) {
            this.testItemById.set(child.id, child);
        }
    }
}
