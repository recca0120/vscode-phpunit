import type {
    ArrayCreationNode,
    ArrayEntryNode,
    ArrowFuncNode,
    AstNode,
    BlockNode,
    ClassConstantAccessNode,
    ClosureNode,
    ConstDeclarationNode,
    EncapsedStringNode,
    ForeachStatementNode,
    ForStatementNode,
    MethodNode,
    NumberNode,
    ReturnStatementNode,
    StringNode,
    VariableNode,
    YieldExpressionNode,
} from '../AstParser/AstNode';

type Bindings = Record<string, unknown>;

/**
 * Parses data provider sources to extract dataset labels.
 * Accepts a MethodNode (provider method body) or an array node (inline dataset).
 * Returns empty array for unresolvable patterns (e.g. array_map, loops).
 */
class DataProviderParser {
    parse(node: AstNode, classBody?: AstNode[]): string[] {
        if (node.kind === 'array_creation_expression') {
            return this.extractLabels((node as ArrayCreationNode).entries);
        }

        if (node.kind === 'method_declaration') {
            return this.parseMethodBody((node as MethodNode).body, classBody);
        }

        if (node.kind === 'anonymous_function' || node.kind === 'arrow_function') {
            const body = (node as ClosureNode | ArrowFuncNode).body;
            if (!body || body.kind !== 'compound_statement') {
                return [];
            }
            return this.parseMethodBody((body as BlockNode).children, classBody);
        }

        return [];
    }

    private parseMethodBody(body: AstNode[] | undefined, classBody?: AstNode[]): string[] {
        if (!body) {
            return [];
        }

        const returns = body.filter((s): s is ReturnStatementNode => s.kind === 'return_statement');
        const yields = body.filter((s): s is YieldExpressionNode => s.kind === 'yield_expression');

        if (returns.length === 1 && returns[0].value?.kind === 'array_creation_expression') {
            return this.extractLabels((returns[0].value as ArrayCreationNode).entries);
        }

        if (yields.length > 0) {
            return this.extractLabels(yields);
        }

        for (const stmt of body) {
            let result: string[] | undefined;
            if (stmt.kind === 'for_statement') {
                result = this.evaluateForLoop(stmt as ForStatementNode);
            } else if (stmt.kind === 'foreach_statement') {
                result = this.evaluateForeachLoop(stmt as ForeachStatementNode, classBody);
            }
            if (result && result.length > 0) {
                return result;
            }
        }

        return [];
    }

    private evaluateForLoop(loop: ForStatementNode): string[] {
        if (!loop.init || !loop.condition || !loop.update) {
            return [];
        }

        const startValue = this.resolveNumber(loop.init.value);
        const endValue = this.resolveNumber(loop.condition.value);
        if (startValue === undefined || endValue === undefined) {
            return [];
        }

        const iterations: Bindings[] = [];
        const varName = loop.init.variable;
        const op = loop.condition.operator;
        const isIncrement = loop.update.operator === '++';

        for (
            let i = startValue;
            this.checkCondition(i, op, endValue);
            i = isIncrement ? i + 1 : i - 1
        ) {
            iterations.push({ [varName]: i });
            if (iterations.length > 1000) break; // safety limit
        }

        return this.evaluateLoopYields(iterations, loop.body);
    }

    private evaluateForeachLoop(loop: ForeachStatementNode, classBody?: AstNode[]): string[] {
        const items = this.resolveIterable(loop.source, classBody);
        if (!items) {
            return [];
        }

        const iterations: Bindings[] = items.map((item) => ({
            [loop.valueVariable]: item,
        }));

        return this.evaluateLoopYields(iterations, loop.body);
    }

    private evaluateLoopYields(iterations: Bindings[], bodyYields: AstNode[]): string[] {
        const yields = bodyYields.filter(
            (s): s is YieldExpressionNode => s.kind === 'yield_expression',
        );
        if (yields.length === 0) {
            return [];
        }

        const labels: string[] = [];
        let numericIndex = 0;

        for (const bindings of iterations) {
            for (const yieldNode of yields) {
                if (!yieldNode.key) {
                    labels.push(`#${numericIndex++}`);
                    continue;
                }
                const resolved = this.resolveExpression(yieldNode.key, bindings);
                if (resolved !== undefined) {
                    labels.push(`"${resolved}"`);
                } else {
                    labels.push(`#${numericIndex++}`);
                }
            }
        }

        return labels;
    }

    private resolveExpression(node: AstNode, bindings: Bindings): string | undefined {
        if (node.kind === 'string') {
            return (node as StringNode).value;
        }

        if (node.kind === 'variable') {
            const val = bindings[(node as VariableNode).name];
            return val !== undefined ? String(val) : undefined;
        }

        if (node.kind === 'encapsed_string') {
            return this.interpolateString(node as EncapsedStringNode, bindings);
        }

        if (node.kind === 'number') {
            return String((node as NumberNode).value);
        }

        return undefined;
    }

    private interpolateString(node: EncapsedStringNode, bindings: Bindings): string {
        return node.parts
            .map((part) => {
                if (part.kind === 'string') {
                    return (part as StringNode).value;
                }
                if (part.kind === 'variable') {
                    const val = bindings[(part as VariableNode).name];
                    return val !== undefined ? String(val) : `$${(part as VariableNode).name}`;
                }
                return '';
            })
            .join('');
    }

    private resolveIterable(source: AstNode, classBody?: AstNode[]): unknown[] | undefined {
        if (source.kind === 'array_creation_expression') {
            return (source as ArrayCreationNode).entries.map((entry) => {
                if (entry.value?.kind === 'string') {
                    return (entry.value as StringNode).value;
                }
                if (entry.value?.kind === 'number') {
                    return (entry.value as NumberNode).value;
                }
                return undefined;
            });
        }

        if (source.kind === 'class_constant_access' && classBody) {
            const constAccess = source as ClassConstantAccessNode;
            const constDecl = classBody.find(
                (n): n is ConstDeclarationNode =>
                    n.kind === 'const_declaration' &&
                    (n as ConstDeclarationNode).name === constAccess.name,
            );
            if (constDecl?.value) {
                return this.resolveIterable(constDecl.value);
            }
        }

        return undefined;
    }

    private resolveNumber(node: AstNode): number | undefined {
        if (node.kind === 'number') {
            return (node as NumberNode).value;
        }
        if (node.kind === 'string') {
            const num = Number((node as StringNode).value);
            return Number.isNaN(num) ? undefined : num;
        }
        return undefined;
    }

    private checkCondition(current: number, operator: string, limit: number): boolean {
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

    private extractLabels(entries: (ArrayEntryNode | YieldExpressionNode)[]): string[] {
        let numericIndex = 0;
        return entries.map((entry) => {
            if (entry.key?.kind === 'string' && entry.key.value) {
                return `"${entry.key.value}"`;
            }
            return `#${numericIndex++}`;
        });
    }
}

export const dataProviderParser = new DataProviderParser();
