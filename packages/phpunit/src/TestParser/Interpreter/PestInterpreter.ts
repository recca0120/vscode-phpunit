import type {
    ArrayCreationNode,
    AstNode,
    CallNode,
    ExpressionStatementNode,
    NamespaceNode,
} from '../AstParser/AstNode';
import { getAstChildren } from '../AstParser/AstNode';
import { dataProviderParser } from './DataProviderParser';
import { toRange } from './toRange';
import type { PestCallDescriptor } from './types';

const pestFunctionNames = new Set(['test', 'it', 'describe', 'arch']);

export function collectPestCalls(
    ast: AstNode,
    namespaceNode: NamespaceNode | undefined,
): PestCallDescriptor[] {
    const sourceChildren = namespaceNode ? namespaceNode.children : getAstChildren(ast);
    const result: PestCallDescriptor[] = [];

    for (const node of sourceChildren) {
        if (node.kind !== 'expression_statement') {
            continue;
        }

        const expr = (node as ExpressionStatementNode).expression;
        if (expr.kind !== 'function_call_expression') {
            continue;
        }

        const pest = buildPestCallDescriptor(expr as CallNode);
        if (pest) {
            result.push(pest);
        }
    }

    return result;
}

function buildPestCallDescriptor(call: CallNode): PestCallDescriptor | undefined {
    const rootCall = findRootPestCall(call);
    if (!rootCall) {
        return undefined;
    }

    const fnName = rootCall.name;
    const args = rootCall.arguments;
    const firstArg = args[0];
    const description =
        firstArg?.kind === 'string'
            ? firstArg.value
            : firstArg?.kind === 'argument' && firstArg.value?.kind === 'string'
              ? firstArg.value.value
              : undefined;

    const datasets = collectPestDatasets(call, rootCall);

    let children: PestCallDescriptor[] = [];
    if (fnName === 'describe') {
        children = collectDescribeChildren(rootCall);
    }

    return {
        fnName,
        description,
        range: toRange(rootCall.loc),
        datasets,
        children,
        chainCalls: collectChainCalls(call, rootCall),
    };
}

function findRootPestCall(call: CallNode): CallNode | undefined {
    if (pestFunctionNames.has(call.name)) {
        return call;
    }

    const calls: CallNode[] = [];
    let cur: CallNode | undefined = call;
    while (cur) {
        calls.push(cur);
        cur = cur.chain;
    }

    return calls.find((c) => pestFunctionNames.has(c.name));
}

function collectChainCalls(outerCall: CallNode, rootCall: CallNode): string[] {
    const result: string[] = [];
    let cur: CallNode | undefined = outerCall;
    while (cur) {
        if (cur !== rootCall) {
            result.push(cur.name);
        }
        cur = cur.chain;
    }
    result.reverse();
    return result;
}

const supportedWithKinds = new Set([
    'array_creation_expression',
    'anonymous_function',
    'arrow_function',
]);

function collectPestDatasets(outerCall: CallNode, rootCall: CallNode): string[] {
    const withCalls: CallNode[] = [];
    let cur: CallNode | undefined = outerCall;
    while (cur) {
        if (cur.name === 'with' && cur !== rootCall) {
            withCalls.push(cur);
        }
        cur = cur.chain;
    }

    if (withCalls.length === 0) {
        return [];
    }

    withCalls.reverse();

    const sources: AstNode[] = [];
    for (const withCall of withCalls) {
        const firstArg = withCall.arguments[0];
        if (firstArg && supportedWithKinds.has(firstArg.kind)) {
            sources.push(firstArg);
        }
    }

    if (sources.length === 0) {
        return [];
    }

    if (sources.length === 1) {
        return dataProviderParser.parse(sources[0]);
    }

    const allArrays = sources.every((n) => n.kind === 'array_creation_expression');
    if (allArrays) {
        const datasets = sources.map((n) => {
            return (n as ArrayCreationNode).entries.map((entry) => {
                if (entry.key?.kind === 'string' && entry.key.value) {
                    return entry.key.value;
                }
                if (entry.value?.kind === 'string') {
                    return entry.value.value;
                }
                return '';
            });
        });
        return cartesianProduct(datasets);
    }

    return sources.flatMap((source) => dataProviderParser.parse(source));
}

function cartesianProduct(datasets: string[][]): string[] {
    let combinations: string[][] = datasets[0].map((v) => [v]);
    for (let i = 1; i < datasets.length; i++) {
        combinations = combinations.flatMap((combo) => datasets[i].map((v) => [...combo, v]));
    }
    return combinations.map((combo) => `"(${combo.map((v) => `|'${v}|'`).join(', ')})"`);
}

function collectDescribeChildren(describeCall: CallNode): PestCallDescriptor[] {
    const closureArg = describeCall.arguments[1];
    if (!closureArg) {
        return [];
    }

    let bodyNode: AstNode | undefined;
    if (closureArg.kind === 'anonymous_function' || closureArg.kind === 'arrow_function') {
        bodyNode = closureArg.body;
    } else if (closureArg.kind === 'argument') {
        const val = closureArg.value;
        if (val.kind === 'anonymous_function' || val.kind === 'arrow_function') {
            bodyNode = val.body;
        }
    }

    if (!bodyNode) {
        return [];
    }

    if (bodyNode.kind === 'function_call_expression') {
        const pest = buildPestCallDescriptor(bodyNode as CallNode);
        return pest ? [pest] : [];
    }

    const stmts = bodyNode.kind === 'compound_statement' ? bodyNode.children : [];
    const result: PestCallDescriptor[] = [];

    for (const stmt of stmts) {
        if (stmt.kind !== 'expression_statement') {
            continue;
        }
        const expr = (stmt as ExpressionStatementNode).expression;
        if (expr.kind !== 'function_call_expression') {
            continue;
        }
        const pest = buildPestCallDescriptor(expr as CallNode);
        if (pest) {
            result.push(pest);
        }
    }

    return result;
}
