import type { AstNode, IfStatementNode, YieldExpressionNode } from '../../AstParser/AstNode';
import type { Context } from '../Expression';
export const MAX_ITERATIONS = 1000;

export type LoopContext = {
    context: Context;
    entries: Map<string, unknown>;
    numericIndex: number;
    unresolved: boolean;
};
export type StmtResult = 'break' | 'continue' | undefined;

export function createLoopContext(context: Context): LoopContext {
    return { context, entries: new Map(), numericIndex: 0, unresolved: false };
}

export function loopResult(ctx: LoopContext): Map<string, unknown> | undefined {
    return ctx.unresolved ? undefined : ctx.entries;
}

export function buildConditionNode(variable: string, operator: string, right: AstNode): AstNode {
    return {
        kind: 'binary_expression',
        left: { kind: 'variable', name: variable },
        operator,
        right,
    } as AstNode;
}

function collect(ctx: LoopContext, key: unknown, value: unknown): void {
    if (typeof key === 'number' || (typeof key === 'string' && /^\d+$/.test(key))) {
        ctx.entries.set(String(ctx.numericIndex++), value);
        return;
    }
    ctx.entries.set(String(key), value);
}

function resolveAndCollect(stmt: AstNode, ctx: LoopContext): StmtResult {
    const result = ctx.context.resolve(stmt);
    if (!(result instanceof Map)) {
        return undefined;
    }
    for (const [key, value] of result) {
        collect(ctx, key, value);
    }
    return undefined;
}

function resolveOnly(stmt: AstNode, ctx: LoopContext): StmtResult {
    ctx.context.resolve(stmt);
    return undefined;
}

const bodyStatementHandlers: Record<string, (stmt: AstNode, ctx: LoopContext) => StmtResult> = {
    break_statement: () => 'break',
    continue_statement: () => 'continue',
    if_statement: (stmt, ctx) => {
        const condResult = ctx.context.resolve(stmt);
        if (condResult === undefined) {
            return undefined;
        }
        const ifStmt = stmt as IfStatementNode;
        const branch = condResult ? ifStmt.body : (ifStmt.elseBody ?? []);
        return executeBodyStatements(branch, ctx);
    },
    yield_expression: (stmt, ctx) => {
        const yieldNode = stmt as YieldExpressionNode;
        const value = yieldNode.value ? ctx.context.resolve(yieldNode.value) : undefined;
        if (!yieldNode.key) {
            collect(ctx, ctx.numericIndex, value);
            return undefined;
        }
        const key = ctx.context.resolve(stmt);
        if (key === undefined) {
            ctx.unresolved = true;
            return 'break';
        }
        collect(ctx, key, value);
        return undefined;
    },
    for_statement: resolveAndCollect,
    foreach_statement: resolveAndCollect,
    update_expression: resolveOnly,
    assignment_expression: resolveOnly,
};

export function executeBodyStatements(statements: AstNode[], ctx: LoopContext): StmtResult {
    for (const stmt of statements) {
        const handler = bodyStatementHandlers[stmt.kind];
        if (!handler) {
            continue;
        }
        const signal = handler(stmt, ctx);
        if (signal) {
            return signal;
        }
    }
    return undefined;
}
