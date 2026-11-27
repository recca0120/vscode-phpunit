import type { AstNode, UpdateExpressionNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class UpdateExpression implements Expression<number> {
    supports(node: AstNode): boolean {
        return node.kind === 'update_expression';
    }

    resolve(node: AstNode, context: Context): number | undefined {
        const upd = node as UpdateExpressionNode;
        const current = context.bindings[upd.variable];
        if (typeof current !== 'number') {
            return undefined;
        }

        const result = upd.operator === '++' ? current + 1 : current - 1;
        context.bindings[upd.variable] = result;
        return result;
    }
}

export const updateExpression = new UpdateExpression();
