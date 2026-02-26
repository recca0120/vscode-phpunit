import {
    DatasetResolver,
    parseDataset,
    type TestRunnerObserver,
    type TestStarted,
} from '@vscode-phpunit/phpunit';
import type { TestItem } from 'vscode';
import type { TestCollection } from '../TestCollection/TestCollection';

export class DatasetChildObserver implements TestRunnerObserver {
    private readonly resolver: DatasetResolver;

    constructor(
        private testCollection: TestCollection,
        private testItemById: Map<string, TestItem>,
    ) {
        this.resolver = new DatasetResolver(testCollection.definitionStore);
    }

    testStarted(result: TestStarted): void {
        const childDef = this.resolver.resolve(result);
        if (!childDef) {
            return;
        }

        const { parentId } = parseDataset(result.id);
        const child = this.testCollection.addDatasetChild(parentId, childDef);
        if (child) {
            this.testItemById.set(child.id, child);
        }
    }
}
