import type { AstNode, StringNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class StringLiteralExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'string';
    }

    resolve(node: AstNode, _context: Context): string | undefined {
        return (node as StringNode).value;
    }
}

export const stringLiteralExpression = new StringLiteralExpression();
