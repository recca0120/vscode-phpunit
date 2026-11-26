import type { TestRunnerObserver, TestStarted } from '@vscode-phpunit/phpunit';
import type { TestItem } from 'vscode';
import type { TestTree } from '../TestTree/TestTree';

export class DatasetObserver implements TestRunnerObserver {
    constructor(
        private testTree: TestTree,
        private testItemById: Map<string, TestItem>,
    ) {}

    testStarted(result: TestStarted): void {
        const child = this.testTree.resolveDatasetChild(result);
        if (child) {
            this.testItemById.set(child.id, child);
        }
    }
}
