import type { AstNode, BooleanNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class BooleanLiteralExpression implements Expression<boolean> {
    supports(node: AstNode): boolean {
        return node.kind === 'boolean';
    }

    resolve(node: AstNode, _context: Context): boolean | undefined {
        return (node as BooleanNode).value;
    }
}

export const booleanLiteralExpression = new BooleanLiteralExpression();
