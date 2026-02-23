import type { AstNode, BinaryOpNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';

class BinaryExpression implements Expression<unknown> {
    constructor(private readonly operators: Record<string, (a: unknown, b: unknown) => unknown>) {}

    supports(node: AstNode): boolean {
        return (
            node.kind === 'binary_expression' && (node as BinaryOpNode).operator in this.operators
        );
    }

    resolve(node: AstNode, context: Context): unknown {
        const bin = node as BinaryOpNode;
        const left = context.resolve(bin.left);
        const right = context.resolve(bin.right);
        if (left == null || right == null) {
            return undefined;
        }
        return this.operators[bin.operator]?.(left, right);
    }
}

// --- Helpers ---

function toNumber(value: unknown): number | undefined {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? undefined : n;
}

function numOp(
    fn: (a: number, b: number) => number,
): (a: unknown, b: unknown) => number | undefined {
    return (a, b) => {
        const an = toNumber(a);
        const bn = toNumber(b);
        return an !== undefined && bn !== undefined ? fn(an, bn) : undefined;
    };
}

function toType(value: unknown, type: string): string | number {
    if (type === 'number') {
        return typeof value === 'number' ? value : Number(value);
    }
    return String(value);
}

function looseCompare(
    fn: (a: string | number, b: string | number) => unknown,
): (a: unknown, b: unknown) => unknown {
    return (a, b) => {
        const type = typeof a;
        return fn(toType(a, type), toType(b, type));
    };
}

// --- Instance ---

const binaryExpr = new BinaryExpression({
    '.': (a, b) => String(a) + String(b),
    '%': numOp((a, b) => a % b),
    '+': numOp((a, b) => a + b),
    '-': numOp((a, b) => a - b),
    '*': numOp((a, b) => a * b),
    '<': looseCompare((a, b) => a < b),
    '<=': looseCompare((a, b) => a <= b),
    '>': looseCompare((a, b) => a > b),
    '>=': looseCompare((a, b) => a >= b),
    '==': looseCompare((a, b) => a === b),
    '===': (a, b) => a === b,
    '!=': looseCompare((a, b) => a !== b),
    '!==': (a, b) => a !== b,
});

// --- Compare ---

export function compare(node: AstNode, context: Context): boolean | undefined {
    if (!binaryExpr.supports(node)) {
        return undefined;
    }
    return binaryExpr.resolve(node, context) as boolean | undefined;
}

// --- Export ---

export { binaryExpr };
