import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

class SubstrExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'substr';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const args = (node as CallNode).arguments;
        const s = context.resolve(args[0]);
        const start = context.resolve(args[1]);
        if (typeof s !== 'string' || start === undefined) {
            return undefined;
        }
        const offset = Number(start);
        const begin = offset < 0 ? Math.max(s.length + offset, 0) : Math.min(offset, s.length);
        const length = args.length >= 3 ? context.resolve(args[2]) : undefined;
        if (length === undefined || length === null) {
            return s.slice(begin);
        }

        const count = Number(length);
        const end = count < 0 ? s.length + count : begin + count;
        return end <= begin ? '' : s.slice(begin, end);
    }
}

export const substrExpression = new SubstrExpression();
