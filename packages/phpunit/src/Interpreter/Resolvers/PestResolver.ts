import { datasetExpander } from '../../TestParser/DatasetExpander';
import type {
    AstNode,
    CallNode,
    ClassConstantAccessNode,
    ExpressionStatementNode,
} from '../AstParser/AstNode';
import { evaluate } from '../Expressions/PhpExpression';
import type { PHP } from '../PHP';
import type { FileInfo, PestCallDescriptor, Resolver } from '../types';
import { CallVisitor } from '../Visitors/CallVisitor';
import { FQNResolver } from './FQNResolver';

const pestFunctionNames = new Set(['test', 'it', 'describe', 'arch']);
const modifierNames = new Set(['skip', 'todo', 'only', 'group']);

function* walkChain(call: CallNode): Generator<CallNode> {
    let cur: CallNode | undefined = call;
    while (cur) {
        yield cur;
        cur = cur.chain;
    }
}

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

function unwrapArgument(node: AstNode | undefined): AstNode | undefined {
    return node?.kind === 'argument' ? node.value : node;
}

function extractDescription(args: AstNode[], php: PHP): string | undefined {
    const firstArg = unwrapArgument(args[0]);
    if (firstArg?.kind === 'string') {
        return firstArg.value;
    }
    if (firstArg?.kind === 'class_constant_access') {
        const node = firstArg as ClassConstantAccessNode;
        if (node.name === 'class') {
            return php.getResolver(FQNResolver).resolveFQN(node.scope);
        }
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
    skipped: boolean;
    skipReason?: string;
    todo: boolean;
    only: boolean;
    group: string[];
}

function extractSkipReason(args: AstNode[]): string | undefined {
    const firstArg = unwrapArgument(args[0]);
    return firstArg?.kind === 'string' ? firstArg.value : undefined;
}

function extractStringArguments(args: AstNode[]): string[] {
    return args
        .map(unwrapArgument)
        .filter((arg): arg is AstNode & { value: string } => arg?.kind === 'string')
        .map((arg) => arg.value);
}

function walkAndCollect(call: CallNode): ChainWalkResult | undefined {
    let rootCall: CallNode | undefined;
    const preRoot: string[] = [];
    const postRoot: string[] = [];
    const withSources: AstNode[] = [];
    let skipped = false;
    let skipReason: string | undefined;
    let todo = false;
    let only = false;
    const groupCalls: string[][] = [];

    for (const cur of walkChain(call)) {
        if (!rootCall && pestFunctionNames.has(cur.name)) {
            rootCall = cur;
        } else if (cur.name === 'with') {
            const arg = cur.arguments[0];
            if (arg && supportedWithKinds.has(arg.kind)) {
                withSources.push(arg);
            }
        } else if (modifierNames.has(cur.name)) {
            switch (cur.name) {
                case 'skip':
                    skipped = true;
                    skipReason = extractSkipReason(cur.arguments) ?? skipReason;
                    break;
                case 'todo':
                    todo = true;
                    break;
                case 'only':
                    only = true;
                    break;
                case 'group':
                    groupCalls.push(extractStringArguments(cur.arguments));
                    break;
            }
            (rootCall ? preRoot : postRoot).push(cur.name);
        } else if (!rootCall) {
            postRoot.push(cur.name);
        } else {
            preRoot.push(cur.name);
        }
    }

    if (!rootCall) {
        return undefined;
    }

    return {
        rootCall,
        chainCalls: [...preRoot.reverse(), ...postRoot.reverse()],
        withSources: withSources.reverse(),
        skipped,
        skipReason,
        todo,
        only,
        group: groupCalls.reverse().flat(),
    };
}

function buildPestCallDescriptor(call: CallNode, php: PHP): PestCallDescriptor | undefined {
    const result = walkAndCollect(call);
    if (!result) {
        return undefined;
    }

    const { rootCall, chainCalls, withSources, skipped, skipReason, todo, only, group } = result;

    const isTestCall = rootCall.name === 'it' || rootCall.name === 'test';

    return {
        fnName: rootCall.name,
        description: extractDescription(rootCall.arguments, php),
        range: rootCall.loc,
        datasets: resolveDatasets(withSources),
        children: rootCall.name === 'describe' ? collectDescribeChildren(rootCall, php) : [],
        chainCalls,
        skipped: skipped || undefined,
        skipReason,
        todo: todo || undefined,
        only: only || undefined,
        group: group.length > 0 ? group : undefined,
        browserTest: isTestCall ? detectsBrowserTestCall(rootCall) : undefined,
    };
}

// --- Browser test detection (Pest 4) ---
//
// visit() is not a chained modifier like ->skip()/->todo(); it's a statement
// written inside the test closure's body. This scan is fully independent of
// walkAndCollect's chain-walking logic: it only looks at the closure argument
// of the test's root call (it/test) and walks its body for a `visit(...)` call.

function detectsBrowserTestCall(rootCall: CallNode): boolean {
    const closureArg = rootCall.arguments[rootCall.arguments.length - 1];
    if (!closureArg) {
        return false;
    }

    const body = unwrapClosureBody(closureArg);
    if (!body) {
        return false;
    }

    return detectsBrowserTest(body);
}

function detectsBrowserTest(closureBody: AstNode): boolean {
    if (closureBody.kind !== 'compound_statement') {
        return expressionHasVisitCall(closureBody);
    }

    return closureBody.children.some(
        (stmt) => stmt.kind === 'expression_statement' && expressionHasVisitCall(stmt.expression),
    );
}

function expressionHasVisitCall(node: AstNode | undefined): boolean {
    if (!node) {
        return false;
    }

    if (node.kind === 'assignment_expression') {
        return expressionHasVisitCall(node.value);
    }

    if (node.kind !== 'function_call_expression') {
        return false;
    }

    for (const cur of walkChain(node)) {
        if (cur.name === 'visit') {
            return true;
        }
    }
    return false;
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

    // Cartesian failed (e.g. closure/generator can't be statically resolved); fall back to independent resolution
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
            labels.push(datasetExpander.named(formatted));
        } else {
            labels.push(datasetExpander.named(`dataset "${key}"`));
        }
    }
    return deduplicateLabels(labels);
}

function deduplicateLabels(labels: string[]): string[] {
    const counts = new Map<string, number>();
    for (const label of labels) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const indices = new Map<string, number>();
    return labels.map((label) => {
        if ((counts.get(label) ?? 0) <= 1) {
            return label;
        }
        const idx = (indices.get(label) ?? 0) + 1;
        indices.set(label, idx);
        return `${label} #${idx}`;
    });
}

const MAX_DATASET_ITEMS = 3;

function formatPestValue(value: unknown): string | undefined {
    if (value instanceof Map || Array.isArray(value)) {
        const items = value instanceof Map ? [...value.values()] : value;
        const truncated = items.length > MAX_DATASET_ITEMS;
        const visible = items.slice(0, MAX_DATASET_ITEMS);
        const parts = visible.map((v) => (typeof v === 'string' ? `'${v}'` : String(v)));
        if (truncated) {
            parts.push('…');
        }
        return `(${parts.join(', ')})`;
    }
    if (typeof value === 'string') {
        return `('${value}')`;
    }
    return undefined;
}

function cartesianProduct(datasets: string[][]): string[] {
    let combinations: string[][] = datasets[0].map((v) => [v]);
    for (let i = 1; i < datasets.length; i++) {
        combinations = combinations.flatMap((combo) => datasets[i].map((v) => [...combo, v]));
    }
    return combinations.map((combo) =>
        datasetExpander.named(combo.map((v) => `('${v}')`).join(' / ')),
    );
}

function unwrapClosureBody(node: AstNode): AstNode | undefined {
    const value = unwrapArgument(node);
    if (value?.kind === 'anonymous_function' || value?.kind === 'arrow_function') {
        return value.body;
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
