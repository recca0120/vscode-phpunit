import type { TestDefinition } from '../types';
import type { ClassInfo } from './ClassInfo';

export interface ParseResult {
    tests: TestDefinition[];
    classes: ClassInfo[];
    includes?: string[];
}
