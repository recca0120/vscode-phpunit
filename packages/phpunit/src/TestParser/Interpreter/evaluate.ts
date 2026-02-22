import type {
    ArrayEntryNode,
    AstNode,
    ConstDeclarationNode,
    EncapsedStringNode,
    ForeachStatementNode,
    ForStatementNode,
    ReturnStatementNode,
    UpdateExpressionNode,
    WhileStatementNode,
    YieldExpressionNode,
} from '../AstParser/AstNode';

type Bindings = Record<string, unknown>;

export function evaluateMethodBody(body: AstNode[] | undefined, classBody?: AstNode[]): string[] {
    if (!body) {
        return [];
    }

    const returns = body.filter((s): s is ReturnStatementNode => s.kind === 'return_statement');
    const yields = body.filter((s): s is YieldExpressionNode => s.kind === 'yield_expression');

    if (returns.length === 1 && returns[0].value?.kind === 'array_creation_expression') {
        return extractLabels(returns[0].value.entries);
    }

    if (returns.length === 1 && returns[0].value?.kind === 'function_call_expression') {
        const result = evaluateFunctionCallReturn(returns[0].value);
        if (result) {
            return result;
        }
    }

    if (yields.length > 0) {
        return extractLabels(yields);
    }

    // Collect top-level assignments for while loop bindings
    const bindings: Bindings = {};
    for (const stmt of body) {
        if (stmt.kind === 'assignment_expression') {
            const { kind, value } = stmt.value as { kind: string; value?: unknown };
            if (kind === 'number' || kind === 'string') {
                bindings[stmt.variable] = value;
            }
            continue;
        }

        let result: string[] | undefined;
        if (stmt.kind === 'for_statement') {
            result = evaluateForLoop(stmt);
        } else if (stmt.kind === 'foreach_statement') {
            result = evaluateForeachLoop(stmt, classBody);
        } else if (stmt.kind === 'while_statement') {
            result = evaluateWhileLoop(stmt, bindings);
        }
        if (result && result.length > 0) {
            return result;
        }
    }

    return [];
}

function evaluateForLoop(loop: ForStatementNode): string[] {
    const iterations = buildForIterations(loop);
    if (!iterations) {
        return [];
    }
    return evaluateLoopYields(iterations, loop.body);
}

function buildForIterations(
    loop: ForStatementNode,
    outerBindings?: Bindings,
): Bindings[] | undefined {
    if (!loop.init || !loop.condition || !loop.update) {
        return undefined;
    }
    const startValue = resolveNumber(loop.init.value);
    const endValue = resolveNumber(loop.condition.value);
    if (startValue === undefined || endValue === undefined) {
        return undefined;
    }
    const varName = loop.init.variable;
    const op = loop.condition.operator;
    const isIncrement = loop.update.operator === '++';
    const iterations: Bindings[] = [];
    for (let i = startValue; checkCondition(i, op, endValue); i = isIncrement ? i + 1 : i - 1) {
        iterations.push({ ...outerBindings, [varName]: i });
        if (iterations.length > 1000) break;
    }
    return iterations;
}

function evaluateForeachLoop(loop: ForeachStatementNode, classBody?: AstNode[]): string[] {
    const items = resolveIterable(loop.source, classBody);
    if (!items) {
        return [];
    }

    const iterations: Bindings[] = items.map((item) => ({
        [loop.valueVariable]: item,
    }));

    return evaluateLoopYields(iterations, loop.body, classBody);
}

function evaluateWhileLoop(loop: WhileStatementNode, initialBindings: Bindings): string[] {
    const bindings = { ...initialBindings };
    const { variable, operator, value: limitNode } = loop.condition;
    const limit = resolveNumber(limitNode);
    if (limit === undefined || !variable) {
        return [];
    }

    const updates = loop.body.filter(
        (s): s is UpdateExpressionNode => s.kind === 'update_expression',
    );

    const iterations: Bindings[] = [];
    while (checkCondition(Number(bindings[variable] ?? 0), operator, limit)) {
        iterations.push({ ...bindings });
        for (const upd of updates) {
            const current = Number(bindings[upd.variable] ?? 0);
            bindings[upd.variable] = upd.operator === '++' ? current + 1 : current - 1;
        }
        if (iterations.length > 1000) break;
    }

    return evaluateLoopYields(iterations, loop.body);
}

function evaluateFunctionCallReturn(
    node: AstNode & { kind: 'function_call_expression' },
): string[] | undefined {
    const { name, arguments: args } = node;

    if (name === 'array_map' && args.length >= 2) {
        // array_map(fn, array) — count array elements
        const arrayArg = args[1];
        if (arrayArg.kind === 'array_creation_expression') {
            return arrayArg.entries.map((_, i) => `#${i}`);
        }
    }

    if (name === 'array_combine' && args.length >= 2) {
        // array_combine(keys, values) — use key values as labels
        const keysArg = args[0];
        if (keysArg.kind === 'array_creation_expression') {
            return keysArg.entries.map((entry, i) => {
                if (entry.value?.kind === 'string') {
                    return `"${entry.value.value}"`;
                }
                return `#${i}`;
            });
        }
    }

    return undefined;
}

function evaluateLoopYields(
    iterations: Bindings[],
    body: AstNode[],
    classBody?: AstNode[],
): string[] {
    const yields = body.filter((s): s is YieldExpressionNode => s.kind === 'yield_expression');
    const innerLoops = body.filter(
        (s): s is ForeachStatementNode | ForStatementNode =>
            s.kind === 'foreach_statement' || s.kind === 'for_statement',
    );

    if (yields.length === 0 && innerLoops.length === 0) {
        return [];
    }

    const labels: string[] = [];
    let numericIndex = 0;

    for (const bindings of iterations) {
        // Direct yields at this level
        for (const yieldNode of yields) {
            if (!yieldNode.key) {
                labels.push(`#${numericIndex++}`);
                continue;
            }
            const resolved = resolveExpression(yieldNode.key, bindings);
            if (resolved !== undefined) {
                labels.push(`"${resolved}"`);
            } else {
                labels.push(`#${numericIndex++}`);
            }
        }

        // Nested loops
        for (const innerLoop of innerLoops) {
            const innerLabels = evaluateInnerLoop(innerLoop, bindings, classBody);
            labels.push(...innerLabels);
        }
    }

    return labels;
}

function evaluateInnerLoop(
    loop: ForeachStatementNode | ForStatementNode,
    outerBindings: Bindings,
    classBody?: AstNode[],
): string[] {
    if (loop.kind === 'foreach_statement') {
        const items = resolveIterable(loop.source, classBody);
        if (!items) {
            return [];
        }
        const innerIterations: Bindings[] = items.map((item) => ({
            ...outerBindings,
            [loop.valueVariable]: item,
        }));
        return evaluateLoopYields(innerIterations, loop.body, classBody);
    }

    // for_statement
    const innerIterations = buildForIterations(loop, outerBindings);
    if (!innerIterations) {
        return [];
    }
    return evaluateLoopYields(innerIterations, loop.body, classBody);
}

function resolveExpression(node: AstNode, bindings: Bindings): string | undefined {
    if (node.kind === 'string') {
        return node.value;
    }

    if (node.kind === 'variable') {
        const val = bindings[node.name];
        return val !== undefined ? String(val) : undefined;
    }

    if (node.kind === 'encapsed_string') {
        return interpolateString(node, bindings);
    }

    if (node.kind === 'number') {
        return String(node.value);
    }

    if (node.kind === 'binary_expression' && node.operator === '.') {
        const left = resolveExpression(node.left, bindings);
        const right = resolveExpression(node.right, bindings);
        if (left !== undefined && right !== undefined) {
            return left + right;
        }
        return undefined;
    }

    if (node.kind === 'conditional_expression') {
        const condResult = evaluateCondition(node.condition, bindings);
        if (condResult === undefined) {
            return undefined;
        }
        return condResult
            ? resolveExpression(node.consequent, bindings)
            : resolveExpression(node.alternate, bindings);
    }

    return undefined;
}

function evaluateCondition(node: AstNode, bindings: Bindings): boolean | undefined {
    if (node.kind === 'binary_expression') {
        const left = resolveExpression(node.left, bindings);
        const right = resolveExpression(node.right, bindings);
        if (left === undefined || right === undefined) {
            return undefined;
        }
        const leftNum = Number(left);
        const rightNum = Number(right);
        if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
            return checkCondition(leftNum, node.operator, rightNum);
        }
        switch (node.operator) {
            case '==':
            case '===':
                return left === right;
            case '!=':
            case '!==':
                return left !== right;
            default:
                return undefined;
        }
    }
    return undefined;
}

export function extractLabels(entries: (ArrayEntryNode | YieldExpressionNode)[]): string[] {
    let numericIndex = 0;
    return entries.map((entry) => {
        if (entry.key?.kind === 'string' && entry.key.value) {
            return `"${entry.key.value}"`;
        }
        return `#${numericIndex++}`;
    });
}

function interpolateString(node: EncapsedStringNode, bindings: Bindings): string {
    return node.parts
        .map((part) => {
            if (part.kind === 'string') {
                return part.value;
            }
            if (part.kind === 'variable') {
                const val = bindings[part.name];
                return val !== undefined ? String(val) : `$${part.name}`;
            }
            return '';
        })
        .join('');
}

function resolveIterable(source: AstNode, classBody?: AstNode[]): unknown[] | undefined {
    if (source.kind === 'array_creation_expression') {
        return source.entries.map((entry) => {
            if (entry.value?.kind === 'string') {
                return entry.value.value;
            }
            if (entry.value?.kind === 'number') {
                return entry.value.value;
            }
            return undefined;
        });
    }

    if (source.kind === 'class_constant_access' && classBody) {
        const constDecl = classBody.find(
            (n): n is ConstDeclarationNode =>
                n.kind === 'const_declaration' && n.name === source.name,
        );
        if (constDecl?.value) {
            return resolveIterable(constDecl.value);
        }
    }

    if (source.kind === 'function_call_expression' && source.name === 'range') {
        return resolveRange(source.arguments);
    }

    return undefined;
}

function resolveRange(args: AstNode[]): unknown[] | undefined {
    if (args.length < 2) {
        return undefined;
    }
    const start = resolveNumber(args[0]);
    const end = resolveNumber(args[1]);
    if (start === undefined || end === undefined) {
        return undefined;
    }
    const step = args.length >= 3 ? resolveNumber(args[2]) : undefined;
    const stepVal = step ?? (start <= end ? 1 : -1);
    if (stepVal === 0) {
        return undefined;
    }
    const result: number[] = [];
    for (let i = start; stepVal > 0 ? i <= end : i >= end; i += stepVal) {
        result.push(i);
        if (result.length > 1000) break;
    }
    return result;
}

function resolveNumber(node: AstNode): number | undefined {
    if (node.kind === 'number') {
        return node.value;
    }
    if (node.kind === 'string') {
        const num = Number(node.value);
        return Number.isNaN(num) ? undefined : num;
    }
    return undefined;
}

function checkCondition(current: number, operator: string, limit: number): boolean {
    switch (operator) {
        case '<':
            return current < limit;
        case '<=':
            return current <= limit;
        case '>':
            return current > limit;
        case '>=':
            return current >= limit;
        default:
            return false;
    }
}
