import { TestDefinition } from '../types';
import { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

export interface Parser {
    parse(definition: PhpAstNodeWrapper): TestDefinition[] | undefined;
}