import type { AstNode, ForStatementNode } from '../../AstParser/AstNode';
import type { Bindings, Context, Expression } from '../Expression';
import { compare } from '../Operators/BinaryExpression';
import {
    buildConditionNode,
    executeBodyStatements,
    type LoopContext,
    MAX_ITERATIONS,
} from './LoopBodyExecutor';

class ForExpression implements Expression<string[]> {
    supports(node: AstNode): boolean {
        return node.kind === 'for_statement';
    }

    resolve(node: AstNode, context: Context): string[] | undefined {
        const loop = node as ForStatementNode;
        if (!loop.init || !loop.condition || !loop.update) {
            return [];
        }

        const varName = loop.init.variable;
        const loopBindings: Bindings = { ...context.bindings };
        const loopContext = context.fork(loopBindings);

        const startValue = loopContext.resolve(loop.init.value);
        if (typeof startValue !== 'number') {
            return [];
        }
        loopBindings[varName] = startValue;

        const conditionNode = buildConditionNode(
            varName,
            loop.condition.operator,
            loop.condition.value,
        );

        const updateNode = {
            kind: 'update_expression',
            variable: varName,
            operator: loop.update.operator,
        } as AstNode;

        const ctx: LoopContext = { context: loopContext, labels: [], numericIndex: 0 };
        let iterCount = 0;

        while (compare(conditionNode, loopContext)) {
            const signal = executeBodyStatements(loop.body, ctx);
            if (signal === 'break') {
                break;
            }
            const newVal = loopContext.resolve(updateNode);
            if (newVal === undefined) break;
            loopBindings[varName] = newVal;
            if (++iterCount > MAX_ITERATIONS) break;
        }

        return ctx.labels;
    }
}

export const forExpression = new ForExpression();
