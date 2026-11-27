import type { AstNode, YieldExpressionNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class YieldLabelExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'yield_expression';
    }

    resolve(node: AstNode, context: Context): unknown {
        const yieldNode = node as YieldExpressionNode;
        if (!yieldNode.key) {
            return undefined;
        }
        const resolved = context.resolve(yieldNode.key);
        if (resolved instanceof Map) {
            return undefined;
        }
        return resolved;
    }
}

export const yieldLabelExpression = new YieldLabelExpression();
