import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class LcfirstExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'lcfirst';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const s = context.resolve((node as CallNode).arguments[0]);
        return typeof s === 'string' ? s.charAt(0).toLowerCase() + s.slice(1) : undefined;
    }
}

export const lcfirstExpression = new LcfirstExpression();
