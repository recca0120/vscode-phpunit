import type { AstNode, ForeachStatementNode } from '../../AstParser/AstNode';
import type { Bindings, Context, Expression } from '../Expression';
import { executeBodyStatements, type LoopContext } from './LoopBodyExecutor';

class ForeachExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'foreach_statement';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const loop = node as ForeachStatementNode;
        const loopBindings: Bindings = { ...context.bindings };
        const loopContext = context.fork(loopBindings);
        const resolved = context.resolve(loop.source);
        if (!(resolved instanceof Map)) {
            return [];
        }

        const ctx: LoopContext = { context: loopContext, labels: [], numericIndex: 0 };

        for (const [key, item] of resolved.entries()) {
            loopBindings[loop.valueVariable] = item;
            if (loop.keyVariable) {
                loopBindings[loop.keyVariable] = /^\d+$/.test(key) ? Number(key) : key;
            }
            const signal = executeBodyStatements(loop.body, ctx);
            if (signal === 'break') {
                break;
            }
        }

        return ctx.labels;
    }
}

export const foreachExpression = new ForeachExpression();
