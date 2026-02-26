import type { TestStarted } from '../TestOutput';
import { resolveDatasetDefinition } from '../TestParser';
import type { TestDefinition } from '../types';
import { parseDataset } from '../utils';

export interface DefinitionStore {
    getDefinition(id: string): TestDefinition | undefined;
    hasDefinition(id: string): boolean;
    setDefinition(id: string, def: TestDefinition): void;
}

export class DatasetResolver {
    constructor(private definitions: DefinitionStore) {}

    resolve(result: TestStarted): TestDefinition | undefined {
        if (!result.id) {
            return undefined;
        }

        const { parentId } = parseDataset(result.id);
        const parentDef = this.definitions.getDefinition(parentId);
        if (!parentDef) {
            return undefined;
        }

        const childDef = resolveDatasetDefinition(result.name, parentDef);
        if (!childDef || this.definitions.hasDefinition(childDef.id)) {
            return undefined;
        }

        this.definitions.setDefinition(childDef.id, childDef);
        return childDef;
    }
}
