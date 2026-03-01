import { datasetExpander } from '../../../TestParser/DatasetExpander';
import type { AstNode, IfStatementNode } from '../../AstParser/AstNode';
import type { Context } from '../Expression';
export const MAX_ITERATIONS = 1000;

export type LoopContext = {
    context: Context;
    labels: string[];
    numericIndex: number;
};
export type StmtResult = 'break' | 'continue' | undefined;

export function buildConditionNode(variable: string, operator: string, right: AstNode): AstNode {
    return {
        kind: 'binary_expression',
        left: { kind: 'variable', name: variable },
        operator,
        right,
    } as AstNode;
}

function resolveAndCollect(stmt: AstNode, ctx: LoopContext): StmtResult {
    const result = ctx.context.resolve(stmt);
    if (Array.isArray(result)) {
        ctx.labels.push(...result);
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
        const resolvedKey = ctx.context.resolve(stmt);
        if (resolvedKey !== undefined) {
            ctx.labels.push(datasetExpander.named(String(resolvedKey)));
        } else {
            ctx.labels.push(datasetExpander.indexed(ctx.numericIndex++));
        }
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
