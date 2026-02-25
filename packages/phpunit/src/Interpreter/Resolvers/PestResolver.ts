import type { AstNode, CallNode, ExpressionStatementNode } from '../AstParser/AstNode';
import { evaluate } from '../Expressions/PhpExpression';
import type { PHP } from '../PHP';
import type { FileInfo, PestCallDescriptor, Resolver } from '../types';
import { CallVisitor } from '../Visitors/CallVisitor';

const pestFunctionNames = new Set(['test', 'it', 'describe', 'arch']);

export class PestResolver implements Resolver {
    private _pestCalls: PestCallDescriptor[] = [];

    get pestCalls(): PestCallDescriptor[] {
        return this._pestCalls;
    }

    reset(): void {
        this._pestCalls = [];
    }

    resolve(php: PHP): void {
        this.reset();
        const visitor = php.getVisitor(CallVisitor);
        for (const call of visitor.calls) {
            const pest = buildPestCallDescriptor(call, php);
            if (pest) {
                this._pestCalls.push(pest);
            }
        }
    }

    contribute(result: Partial<FileInfo>): void {
        result.pestCalls = this._pestCalls;
    }
}

function extractDescription(args: AstNode[]): string | undefined {
    const firstArg = args[0];
    if (firstArg?.kind === 'string') {
        return firstArg.value;
    }
    if (firstArg?.kind === 'argument' && firstArg.value?.kind === 'string') {
        return firstArg.value.value;
    }
    return undefined;
}

const supportedWithKinds = new Set([
    'array_creation_expression',
    'anonymous_function',
    'arrow_function',
]);

interface ChainWalkResult {
    rootCall: CallNode;
    chainCalls: string[];
    withSources: AstNode[];
}

function walkAndCollect(call: CallNode): ChainWalkResult | undefined {
    let rootCall: CallNode | undefined;
    const preRoot: string[] = [];
    const postRoot: string[] = [];
    const withSources: AstNode[] = [];

    let cur: CallNode | undefined = call;
    while (cur) {
        if (!rootCall && pestFunctionNames.has(cur.name)) {
            rootCall = cur;
        } else if (cur.name === 'with') {
            const arg = cur.arguments[0];
            if (arg && supportedWithKinds.has(arg.kind)) {
                withSources.push(arg);
            }
        } else if (!rootCall) {
            postRoot.push(cur.name);
        } else {
            preRoot.push(cur.name);
        }
        cur = cur.chain;
    }

    if (!rootCall) {
        return undefined;
    }

    return {
        rootCall,
        chainCalls: [...preRoot.reverse(), ...postRoot.reverse()],
        withSources: withSources.reverse(),
    };
}

function buildPestCallDescriptor(call: CallNode, php: PHP): PestCallDescriptor | undefined {
    const result = walkAndCollect(call);
    if (!result) {
        return undefined;
    }

    const { rootCall, chainCalls, withSources } = result;

    return {
        fnName: rootCall.name,
        description: extractDescription(rootCall.arguments),
        range: rootCall.loc,
        datasets: resolveDatasets(withSources),
        children: rootCall.name === 'describe' ? collectDescribeChildren(rootCall, php) : [],
        chainCalls,
    };
}

function resolveDatasets(sources: AstNode[]): string[] {
    if (sources.length === 0) {
        return [];
    }

    if (sources.length === 1) {
        return resolvePestLabels(sources[0]);
    }

    const datasets = sources.map((source) => {
        const resolved = evaluateAsMap(source);
        if (!resolved) {
            return [];
        }
        return [...resolved.entries()].map(([key, value]) => {
            if (/^\d+$/.test(key)) {
                return String(value ?? '');
            }
            return String(key);
        });
    });
    if (datasets.every((d) => d.length > 0)) {
        return cartesianProduct(datasets);
    }

    return sources.flatMap((source) => resolvePestLabels(source));
}

function evaluateAsMap(node: AstNode): Map<string, unknown> | undefined {
    const resolved = evaluate(node);
    return resolved instanceof Map ? resolved : undefined;
}

function resolvePestLabels(node: AstNode): string[] {
    const resolved = evaluateAsMap(node);
    if (!resolved) {
        return [];
    }
    const labels: string[] = [];
    for (const [key, value] of resolved.entries()) {
        if (/^\d+$/.test(key)) {
            const formatted = formatPestValue(value);
            if (!formatted) {
                return [];
            }
            labels.push(`data set "${formatted}"`);
        } else {
            labels.push(`data set "dataset "${key}""`);
        }
    }
    return labels;
}

function formatPestValue(value: unknown): string {
    if (value instanceof Map || Array.isArray(value)) {
        const items = value instanceof Map ? [...value.values()] : value;
        return `(${items.map((v) => (typeof v === 'string' ? `'${v}'` : String(v))).join(', ')})`;
    }
    if (typeof value === 'string') {
        return `('${value}')`;
    }
    return String(value ?? '');
}

function cartesianProduct(datasets: string[][]): string[] {
    let combinations: string[][] = datasets[0].map((v) => [v]);
    for (let i = 1; i < datasets.length; i++) {
        combinations = combinations.flatMap((combo) => datasets[i].map((v) => [...combo, v]));
    }
    return combinations.map((combo) => `data set "${combo.map((v) => `('${v}')`).join(' / ')}"`);
}

function unwrapClosureBody(node: AstNode): AstNode | undefined {
    if (node.kind === 'anonymous_function' || node.kind === 'arrow_function') {
        return node.body;
    }
    if (node.kind === 'argument') {
        const val = node.value;
        if (val.kind === 'anonymous_function' || val.kind === 'arrow_function') {
            return val.body;
        }
    }
    return undefined;
}

function collectDescribeChildren(describeCall: CallNode, php: PHP): PestCallDescriptor[] {
    const closureArg = describeCall.arguments[1];
    if (!closureArg) {
        return [];
    }

    const bodyNode = unwrapClosureBody(closureArg);
    if (!bodyNode) {
        return [];
    }

    if (bodyNode.kind === 'function_call_expression') {
        const pest = buildPestCallDescriptor(bodyNode as CallNode, php);
        return pest ? [pest] : [];
    }

    const stmts = bodyNode.kind === 'compound_statement' ? bodyNode.children : [];
    return collectPestCallsFromStatements(stmts, php);
}

function collectPestCallsFromStatements(stmts: AstNode[], php: PHP): PestCallDescriptor[] {
    const result: PestCallDescriptor[] = [];
    for (const node of stmts) {
        if (node.kind !== 'expression_statement') {
            continue;
        }
        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind !== 'function_call_expression') {
            continue;
        }
        const pest = buildPestCallDescriptor(expr as CallNode, php);
        if (pest) {
            result.push(pest);
        }
    }
    return result;
}
