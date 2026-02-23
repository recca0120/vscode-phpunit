import type { AstNode, CallNode } from '../../../AstParser/AstNode';
import type { Context, Expression } from '../../Expression';
import { MAX_ITERATIONS } from '../../Statements/LoopBodyExecutor';

class RangeExpression implements Expression<Map<string, unknown>> {
    supports(node: AstNode): boolean {
        return node.kind === 'function_call_expression' && (node as CallNode).name === 'range';
    }

    resolve(node: AstNode, context: Context): Map<string, unknown> | undefined {
        const args = (node as CallNode).arguments;
        if (args.length < 2) {
            return undefined;
        }
        const start = context.resolve(args[0]);
        const end = context.resolve(args[1]);
        if (typeof start !== 'number' || typeof end !== 'number') {
            return undefined;
        }
        const stepRaw = args.length >= 3 ? context.resolve(args[2]) : undefined;
        const stepVal = typeof stepRaw === 'number' ? stepRaw : start <= end ? 1 : -1;
        if (stepVal === 0) {
            return undefined;
        }
        const result = new Map<string, unknown>();
        let index = 0;
        for (let i = start; stepVal > 0 ? i <= end : i >= end; i += stepVal) {
            result.set(String(index++), i);
            if (index > MAX_ITERATIONS) break;
        }
        return result;
    }
}

export const rangeExpression = new RangeExpression();
