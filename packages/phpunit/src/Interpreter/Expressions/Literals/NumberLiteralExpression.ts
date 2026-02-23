import type { AstNode, NumberNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class NumberLiteralExpression implements Expression<number> {
    supports(node: AstNode): boolean {
        return node.kind === 'number';
    }

    resolve(node: AstNode, _context: Context): number | undefined {
        return (node as NumberNode).value;
    }
}

export const numberLiteralExpression = new NumberLiteralExpression();
