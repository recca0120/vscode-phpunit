import {
    resolveDatasetDefinition,
    stripDataset,
    type TestRunnerObserver,
    type TestStarted,
} from '@vscode-phpunit/phpunit';
import type { TestItem } from 'vscode';
import type { TestCollection } from '../TestCollection/TestCollection';

export class DatasetChildObserver implements TestRunnerObserver {
    constructor(
        private testCollection: TestCollection,
        private testItemById: Map<string, TestItem>,
    ) {}

    testStarted(result: TestStarted): void {
        if (!result.id) {
            return;
        }

        const parentId = stripDataset(result.id);

        if (result.id !== parentId && this.testItemById.has(result.id)) {
            return;
        }

        const parent = this.testItemById.get(parentId);
        if (!parent) {
            return;
        }

        const parentDef = this.testCollection.getTestDefinition(parent);
        if (!parentDef) {
            return;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef) {
            return;
        }

        const child = this.testCollection.addDatasetChild(parent, childDef);
        if (child) {
            this.testItemById.set(child.id, child);
        }
    }
}
