import type { AstNode, SubscriptAccessNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class SubscriptAccessExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'subscript_access_expression';
    }

    resolve(node: AstNode, context: Context): unknown {
        const { object, index } = node as SubscriptAccessNode;
        const obj = context.resolve(object);
        const idx = context.resolve(index);

        if ((typeof obj === 'string' || Array.isArray(obj)) && typeof idx === 'number') {
            return obj[idx];
        }

        return undefined;
    }
}

export const subscriptAccessExpression = new SubscriptAccessExpression();
