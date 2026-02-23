import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';

function simpleSprintf(format: string, args: (string | undefined)[]): string {
    let i = 0;
    return format.replace(/%(?:(\d+)\$)?([0 ]?)(\d*)([dsf])/g, (_match, pos, pad, width, type) => {
        const argIndex = pos ? Number(pos) - 1 : i++;
        const val = args[argIndex] ?? '';
        let result: string;
        if (type === 'd') {
            result = String(Math.trunc(Number(val)));
        } else if (type === 'f') {
            result = String(Number(val));
        } else {
            result = val;
        }
        if (width) {
            const w = Number(width);
            const padChar = pad === '0' ? '0' : ' ';
            result = result.padStart(w, padChar);
        }
        return result;
    });
}

class SprintfExpression implements Expression<string> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'sprintf';
    }

    resolve(node: AstNode, context: Context): string | undefined {
        const args = (node as CallNode).arguments;
        const fmt = context.resolve(args[0]);
        if (typeof fmt !== 'string') {
            return undefined;
        }
        const rest = args.slice(1).map((arg) => {
            const v = context.resolve(arg);
            return v !== undefined ? String(v) : undefined;
        });
        return simpleSprintf(fmt, rest);
    }
}

export const sprintfExpression = new SprintfExpression();
