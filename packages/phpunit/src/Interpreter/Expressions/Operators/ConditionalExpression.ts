import type { AstNode, ConditionalExpressionNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { compare } from './BinaryExpression';

class ConditionalExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'conditional_expression';
    }

    resolve(node: AstNode, context: Context): unknown {
        const cond = node as ConditionalExpressionNode;
        const condResult = compare(cond.condition, context);
        if (condResult === undefined) {
            return undefined;
        }
        return context.resolve(condResult ? cond.consequent : cond.alternate);
    }
}

export const conditionalExpression = new ConditionalExpression();
