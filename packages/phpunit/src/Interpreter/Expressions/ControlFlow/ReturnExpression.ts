import type { AstNode, ReturnStatementNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class ReturnExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'return_statement';
    }

    resolve(node: AstNode, context: Context): unknown {
        const value = (node as ReturnStatementNode).value;
        if (!value) {
            return undefined;
        }
        return context.resolve(value);
    }
}

export const returnExpression = new ReturnExpression();
