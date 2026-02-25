import type { TestStarted } from '../TestOutput';
import { resolveDatasetDefinition } from '../TestParser';
import type { TestDefinition } from '../types';
import { stripDataset } from '../utils';
import type { TestRunnerObserver } from './TestRunnerObserver';

export class DatasetChildResolver implements TestRunnerObserver {
    constructor(private definitions: Map<string, TestDefinition>) {}

    testStarted(result: TestStarted): void {
        if (!result.id) {
            return;
        }

        const parentId = stripDataset(result.id);
        const parentDef = this.definitions.get(parentId);
        if (!parentDef) {
            return;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef || this.definitions.has(childDef.id)) {
            return;
        }

        this.definitions.set(childDef.id, childDef);
    }
}
