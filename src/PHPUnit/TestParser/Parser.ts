import { TestDefinition } from '../types';
import { PHPDefinition } from './PHPDefinition';

export interface Parser {
    parse(definition: PHPDefinition): TestDefinition[] | undefined;
}