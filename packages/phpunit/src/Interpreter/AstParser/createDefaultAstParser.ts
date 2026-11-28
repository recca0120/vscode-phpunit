import type { AstParser } from './AstParser';
import { ChainAstParser } from './ChainAstParser';
import { PhpParserAstParser } from './PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from './TreeSitter/TreeSitterAstParser';

export const createDefaultAstParser = (): AstParser =>
    new ChainAstParser([new TreeSitterAstParser(), new PhpParserAstParser()]);
