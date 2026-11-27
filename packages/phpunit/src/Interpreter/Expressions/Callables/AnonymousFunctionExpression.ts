import type { AstNode, BlockNode } from '../../AstParser/AstNode';
import { resolveCompoundBody } from '../ControlFlow/CompoundStatementExpression';
import type { Context, Expression } from '../Expression';

class AnonymousFunctionExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'anonymous_function';
    }

    resolve(node: AstNode, context: Context): unknown {
        const body = (node as { body?: AstNode }).body;
        if (body?.kind !== 'compound_statement') {
            return undefined;
        }

        return resolveCompoundBody((body as BlockNode).children, context);
    }
}

export const anonymousFunctionExpression = new AnonymousFunctionExpression();
