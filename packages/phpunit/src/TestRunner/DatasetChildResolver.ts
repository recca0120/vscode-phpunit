import type { TestStarted } from '../TestOutput';
import { resolveDatasetDefinition } from '../TestParser';
import type { TestDefinition } from '../types';
import { parseDataset } from '../utils';
import type { TestRunnerObserver } from './TestRunnerObserver';

export class DatasetChildResolver implements TestRunnerObserver {
    constructor(private definitions: Map<string, TestDefinition>) {}

    testStarted(result: TestStarted): TestDefinition | undefined {
        if (!result.id) {
            return undefined;
        }

        const { parentId } = parseDataset(result.id);
        const parentDef = this.definitions.get(parentId);
        if (!parentDef) {
            return undefined;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef || this.definitions.has(childDef.id)) {
            return undefined;
        }

        this.definitions.set(childDef.id, childDef);
        return childDef;
    }
}
