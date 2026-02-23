import type { AstNode } from './AstNode';
import type { AstParser } from './AstParser';

export class ChainAstParser implements AstParser {
    constructor(private parsers: AstParser[]) {}

    parse(code: string, file: string): AstNode | undefined {
        for (const parser of this.parsers) {
            const result = parser.parse(code, file);
            if (result) {
                return result;
            }
        }

        return undefined;
    }
}
