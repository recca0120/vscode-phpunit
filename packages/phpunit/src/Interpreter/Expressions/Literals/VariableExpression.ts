import type { AstNode, VariableNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class VariableExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'variable';
    }

    resolve(node: AstNode, context: Context): unknown {
        return context.bindings[(node as VariableNode).name];
    }
}

export const variableExpression = new VariableExpression();
