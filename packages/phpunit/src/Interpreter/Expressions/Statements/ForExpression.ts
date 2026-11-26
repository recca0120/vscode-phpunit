import type { AstNode, ForStatementNode } from '../../AstParser/AstNode';
import type { Bindings, Context, Expression } from '../Expression';
import { compare } from '../Operators/BinaryExpression';
import {
    buildConditionNode,
    createLoopContext,
    executeBodyStatements,
    loopResult,
    MAX_ITERATIONS,
} from './LoopBodyExecutor';

class ForExpression implements Expression<Map<string, unknown>> {
    supports(node: AstNode): boolean {
        return node.kind === 'for_statement';
    }

    resolve(node: AstNode, context: Context): Map<string, unknown> | undefined {
        const loop = node as ForStatementNode;
        if (!loop.init || !loop.condition || !loop.update) {
            return undefined;
        }

        const varName = loop.init.variable;
        const loopBindings: Bindings = { ...context.bindings };
        const loopContext = context.fork(loopBindings);

        const startValue = loopContext.resolve(loop.init.value);
        if (typeof startValue !== 'number') {
            return undefined;
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

        const ctx = createLoopContext(loopContext);
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

        return loopResult(ctx);
    }
}

export const forExpression = new ForExpression();
