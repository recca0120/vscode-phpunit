import type { TestDefinition } from '../types';
import type { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

export interface Parser {
    parse(definition: PhpAstNodeWrapper): TestDefinition[] | undefined;
}
