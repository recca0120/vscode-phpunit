import type { AstNode, BlockNode } from '../../AstParser/AstNode';
import type { Context, Expression } from '../Expression';
import { extractLabels } from '../PhpExpression';

const loopKinds = new Set(['for_statement', 'foreach_statement', 'while_statement']);

export function resolveCompoundBody(body: AstNode[], context: Context): unknown {
    return (
        evaluateReturnStmt(body, context) ??
        evaluateYields(body, context) ??
        evaluateLoopStmt(body, context)
    );
}

class CompoundStatementExpression implements Expression<unknown> {
    supports(node: AstNode): boolean {
        return node.kind === 'compound_statement';
    }

    resolve(node: AstNode, context: Context): unknown {
        const body = (node as BlockNode).children;
        if (!body) {
            return undefined;
        }

        return resolveCompoundBody(body, context);
    }
}

function evaluateReturnStmt(body: AstNode[], context: Context): string[] | undefined {
    const returns = body.filter((s) => s.kind === 'return_statement');
    if (returns.length !== 1) {
        return undefined;
    }

    const result = context.resolve(returns[0]);
    if (Array.isArray(result)) {
        return result as string[];
    }

    const value = returns[0].value;
    if (!value) {
        return undefined;
    }

    return extractLabels(context.resolve(value));
}

function evaluateYields(body: AstNode[], context: Context): Map<string, unknown> | undefined {
    if (!body.some((s) => s.kind === 'yield_expression')) {
        return undefined;
    }

    const ctx = context.fork({});
    const map = new Map<string, unknown>();
    let numericIndex = 0;
    for (const stmt of body) {
        const result = ctx.resolve(stmt);
        if (stmt.kind === 'yield_expression') {
            if (result !== undefined) {
                map.set(String(result), undefined);
            } else {
                map.set(String(numericIndex++), undefined);
            }
        }
    }
    return map;
}

function evaluateLoopStmt(body: AstNode[], context: Context): string[] | undefined {
    const ctx = context.fork({}, context.classBody);
    for (const stmt of body) {
        if (!loopKinds.has(stmt.kind)) {
            ctx.resolve(stmt);
            continue;
        }
        const result = ctx.resolve(stmt);
        if (Array.isArray(result) && result.length > 0) {
            return result as string[];
        }
    }
    return undefined;
}

export const compoundStatementExpression = new CompoundStatementExpression();
