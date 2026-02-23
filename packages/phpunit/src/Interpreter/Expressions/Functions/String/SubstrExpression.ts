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
        const st = Number(start);
        if (args.length >= 3) {
            const len = context.resolve(args[2]);
            if (len !== undefined) {
                return s.slice(st, st + Number(len));
            }
        }
        return s.slice(st);
    }
}

export const substrExpression = new SubstrExpression();
