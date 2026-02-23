import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class StrRepeatExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'str_repeat';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const args = (node as CallNode).arguments;
        const s = context.resolve(args[0]);
        const n = context.resolve(args[1]);
        if (typeof s !== 'string' || n === undefined) {
            return undefined;
        }
        const count = Math.trunc(Number(n));
        return Number.isNaN(count) || count < 0 ? undefined : s.repeat(count);
    }
}

export const strRepeatExpression = new StrRepeatExpression();
