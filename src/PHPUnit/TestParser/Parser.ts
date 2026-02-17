import type { TestDefinition } from '../types';
import type { PhpAstNodeWrapper } from './php-parser/PhpAstNodeWrapper';

export interface Parser {
    parse(definition: PhpAstNodeWrapper): TestDefinition[] | undefined;
}
