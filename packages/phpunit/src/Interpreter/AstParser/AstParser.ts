import type { AstNode } from './AstNode';

export interface AstParser {
    parse(code: string, file: string): AstNode | undefined;
}
