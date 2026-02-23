import type { AstNode, WhileStatementNode } from '../../AstParser/AstNode';
import type { Bindings, Context, Expression } from '../Expression';
import { compare } from '../Operators/BinaryExpression';
import {
    buildConditionNode,
    executeBodyStatements,
    type LoopContext,
    MAX_ITERATIONS,
} from './LoopBodyExecutor';

class WhileExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'while_statement';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const loop = node as WhileStatementNode;
        const { variable, operator, value: limitNode } = loop.condition;
        const loopBindings: Bindings = { ...context.bindings };
        const loopContext = context.fork(loopBindings);
        const limitRaw = loopContext.resolve(limitNode);
        if (typeof limitRaw !== 'number' || !variable) {
            return [];
        }

        const ctx: LoopContext = { context: loopContext, labels: [], numericIndex: 0 };
        let iterCount = 0;

        const conditionNode = buildConditionNode(variable, operator, limitNode);
        while (compare(conditionNode, loopContext)) {
            const signal = executeBodyStatements(loop.body, ctx);
            if (signal === 'break') {
                break;
            }
            if (++iterCount > MAX_ITERATIONS) break;
        }

        return ctx.labels;
    }
}

export const whileExpression = new WhileExpression();
