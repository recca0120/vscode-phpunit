import type { AstParser } from '../../src/Interpreter/AstParser/AstParser';
import { PhpParserAstParser } from '../../src/Interpreter/AstParser/PhpParser/PhpParserAstParser';
import { TreeSitterAstParser } from '../../src/Interpreter/AstParser/TreeSitter/TreeSitterAstParser';

export const parsers: [string, () => AstParser][] = [
    ['tree-sitter', () => new TreeSitterAstParser()],
    ['php-parser', () => new PhpParserAstParser()],
];
