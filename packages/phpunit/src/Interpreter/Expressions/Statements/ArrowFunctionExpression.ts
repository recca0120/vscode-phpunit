import type { AstNode, BlockNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { extractLabels } from '../PhpExpression';
import { resolveCompoundBody } from './CompoundStatementExpression';

class ArrowFunctionExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'arrow_function';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const body = (node as { body?: AstNode }).body;
        if (!body) {
            return undefined;
        }

        if (body.kind === 'compound_statement') {
            return resolveCompoundBody((body as BlockNode).children, context);
        }

        return extractLabels(context.resolve(body));
    }
}

export const arrowFunctionExpression = new ArrowFunctionExpression();
