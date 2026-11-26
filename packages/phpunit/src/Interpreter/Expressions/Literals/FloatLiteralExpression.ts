import type { AstNode, FloatNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class FloatLiteralExpression implements Expression<number> {
    supports(node: AstNode): boolean {
        return node.kind === 'float';
    }

    resolve(node: AstNode, _context: Context): number | undefined {
        const value = (node as FloatNode).value;
        const magnitude = Math.abs(value);
        if (Number.isInteger(value) || magnitude < 1e-4 || magnitude >= 1e15) {
            return undefined;
        }
        return value;
    }
}

export const floatLiteralExpression = new FloatLiteralExpression();
