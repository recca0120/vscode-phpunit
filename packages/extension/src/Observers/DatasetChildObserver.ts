import {
    DatasetChildResolver,
    stripDataset,
    type TestDefinition,
    type TestRunnerObserver,
    type TestStarted,
} from '@vscode-phpunit/phpunit';
import type { TestItem } from 'vscode';
import type { TestCollection } from '../TestCollection/TestCollection';

export class DatasetChildObserver implements TestRunnerObserver {
    private readonly resolver: DatasetChildResolver;
    private readonly definitions: Map<string, TestDefinition>;

    constructor(
        private testCollection: TestCollection,
        private testItemById: Map<string, TestItem>,
    ) {
        this.definitions = this.buildDefinitions();
        this.resolver = new DatasetChildResolver(this.definitions);
    }

    testStarted(result: TestStarted): void {
        const sizeBefore = this.definitions.size;
        this.resolver.testStarted(result);

        if (this.definitions.size === sizeBefore) {
            return;
        }

        // Find the newly added definition
        const parentId = stripDataset(result.id);
        const parent = this.testItemById.get(parentId);
        if (!parent) {
            return;
        }

        for (const [id, def] of this.definitions) {
            if (!this.testItemById.has(id)) {
                const child = this.testCollection.addDatasetChild(parent, def);
                if (child) {
                    this.testItemById.set(child.id, child);
                }
            }
        }
    }

    private buildDefinitions(): Map<string, TestDefinition> {
        const map = new Map<string, TestDefinition>();
        for (const [id, testItem] of this.testItemById) {
            const def = this.testCollection.getTestDefinition(testItem);
            if (def) {
                map.set(id, def);
            }
        }
        return map;
    }
}
