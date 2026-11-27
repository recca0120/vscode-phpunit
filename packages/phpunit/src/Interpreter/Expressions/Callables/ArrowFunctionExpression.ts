import type { AstNode, BlockNode } from '../../AstParser/AstNode';
import { resolveCompoundBody } from '../ControlFlow/CompoundStatementExpression';
import type { Context, Expression } from '../Expression';

class ArrowFunctionExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'arrow_function';
    }

    resolve(node: AstNode, context: Context): unknown {
        const body = (node as { body?: AstNode }).body;
        if (!body) {
            return undefined;
        }

        if (body.kind === 'compound_statement') {
            return resolveCompoundBody((body as BlockNode).children, context);
        }

        const resolved = context.resolve(body);
        return resolved instanceof Map ? resolved : undefined;
    }
}

export const arrowFunctionExpression = new ArrowFunctionExpression();
