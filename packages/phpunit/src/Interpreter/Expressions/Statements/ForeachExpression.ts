import type { AstNode, ForeachStatementNode } from '../../AstParser/AstNode';
import type { Bindings, Context, Expression } from '../Expression';
import { createLoopContext, executeBodyStatements, loopResult } from './LoopBodyExecutor';

class ForeachExpression implements Expression<Map<string, unknown>> {
    supports(node: AstNode): boolean {
        return node.kind === 'foreach_statement';
    }

    resolve(node: AstNode, context: Context): Map<string, unknown> | undefined {
        const loop = node as ForeachStatementNode;
        const loopBindings: Bindings = { ...context.bindings };
        const loopContext = context.fork(loopBindings);
        const resolved = context.resolve(loop.source);
        if (!(resolved instanceof Map)) {
            return undefined;
        }

        const ctx = createLoopContext(loopContext);

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

        return loopResult(ctx);
    }
}

export const foreachExpression = new ForeachExpression();
