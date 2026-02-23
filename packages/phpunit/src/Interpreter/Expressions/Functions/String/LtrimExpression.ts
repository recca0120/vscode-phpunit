import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class LtrimExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'ltrim';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const s = context.resolve((node as CallNode).arguments[0]);
        return typeof s === 'string' ? s.trimStart() : undefined;
    }
}

export const ltrimExpression = new LtrimExpression();
