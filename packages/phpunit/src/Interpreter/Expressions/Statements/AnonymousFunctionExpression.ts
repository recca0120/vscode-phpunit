import type { AstNode, BlockNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { resolveCompoundBody } from './CompoundStatementExpression';

class AnonymousFunctionExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'anonymous_function';
    }

    resolve(node: AstNode, context: Context): unknown {
        const body = (node as { body?: AstNode }).body;
        if (!body || body.kind !== 'compound_statement') {
            return undefined;
        }

        return resolveCompoundBody((body as BlockNode).children, context);
    }
}

export const anonymousFunctionExpression = new AnonymousFunctionExpression();
