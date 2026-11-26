import type { URI } from 'vscode-uri';
import type { TestDefinition } from '../types';
import type { IndexedFile } from './IndexedFile';

export interface IndexChange {
    parsed: { uri: URI; tests: TestDefinition[] }[];
    deleted: IndexedFile<TestDefinition>[];
}
