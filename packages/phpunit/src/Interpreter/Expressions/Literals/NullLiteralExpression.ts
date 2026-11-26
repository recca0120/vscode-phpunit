import type { AstNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class NullLiteralExpression implements Expression<null> {
    supports(node: AstNode): boolean {
        return node.kind === 'null';
    }

    resolve(_node: AstNode, _context: Context): null {
        return null;
    }
}

export const nullLiteralExpression = new NullLiteralExpression();
