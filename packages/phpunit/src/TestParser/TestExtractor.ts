import type { TestDefinition } from '../types';
import type { ClassInfo } from './ClassHierarchy';
import type { TestNode } from './TestNode';

export interface ParseResult {
    tests: TestDefinition[];
    classes: ClassInfo[];
}

export interface TestExtractor {
    extract(definition: TestNode): ParseResult | undefined;
}
