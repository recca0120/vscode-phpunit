import type { AssignmentNode, AstNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

const compoundOperators: Record<string, (a: number, b: number) => number> = {
    '+=': (a, b) => a + b,
    '-=': (a, b) => a - b,
    '*=': (a, b) => a * b,
    '%=': (a, b) => a % b,
};

class AssignmentExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'assignment_expression';
    }

    resolve(node: AstNode, context: Context): unknown {
        const assign = node as AssignmentNode;
        const result = this.evaluate(assign, context);
        if (result !== undefined) {
            context.bindings[assign.variable] = result;
        }
        return result;
    }

    private evaluate(assign: AssignmentNode, context: Context): unknown {
        if (!assign.operator) {
            return context.resolve(assign.value);
        }

        const fn = compoundOperators[assign.operator];
        if (!fn) {
            return undefined;
        }

        const step = context.resolve(assign.value);
        if (typeof step !== 'number') {
            return undefined;
        }

        const current = context.bindings[assign.variable];
        if (typeof current !== 'number') {
            return 0;
        }

        return fn(current, step);
    }
}

export const assignmentExpression = new AssignmentExpression();
