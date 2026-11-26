import type { AstNode, UnaryExpressionNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

const unaryOperators: Record<string, (operand: number) => number> = {
    '-': (operand) => -operand,
    '+': (operand) => operand,
};

class UnaryExpression implements Expression<number> {
    supports(node: AstNode): boolean {
        return node.kind === 'unary_expression';
    }

    resolve(node: AstNode, context: Context): number | undefined {
        const unary = node as UnaryExpressionNode;
        const apply = unaryOperators[unary.operator];
        if (!apply) {
            return undefined;
        }

        const operand = context.resolve(unary.operand);
        if (typeof operand !== 'number') {
            return undefined;
        }

        return apply(operand);
    }
}

export const unaryExpression = new UnaryExpression();
