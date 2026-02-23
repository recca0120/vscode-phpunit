import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class StrtolowerExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'strtolower';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const s = context.resolve((node as CallNode).arguments[0]);
        return typeof s === 'string' ? s.toLowerCase() : undefined;
    }
}

export const strtolowerExpression = new StrtolowerExpression();
