import type { ArrayEntryNode, AstNode, AstNodeLoc, CallNode, UseItemNode } from '../AstNode';

// biome-ignore lint/suspicious/noExplicitAny: Raw php-parser AST nodes are untyped
type RawNode = any;

const ZERO_NODE = { kind: 'number', value: 0 } as AstNode;
const EMPTY_STRING_NODE = { kind: 'string', value: '' } as AstNode;
const zeroLoc: AstNodeLoc = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

function convertLoc(loc: RawNode): AstNodeLoc | undefined {
    if (!loc) {
        return undefined;
    }
    return {
        start: { line: loc.start.line, character: loc.start.column },
        end: { line: loc.end.line, character: loc.end.column },
    };
}

function convertComments(comments: RawNode[] | undefined): RawNode[] | undefined {
    if (!comments) {
        return undefined;
    }
    return comments.map((c: RawNode) => ({
        kind: 'comment',
        value: c.value,
        loc: convertLoc(c.loc),
    }));
}

export function adapt(raw: RawNode): AstNode {
    return adaptProgram(raw);
}

function adaptProgram(raw: RawNode): AstNode {
    return {
        kind: 'program',
        children: adaptChildren(raw.children ?? []),
        loc: convertLoc(raw.loc),
    };
}

function adaptChildren(children: RawNode[]): AstNode[] {
    const result: AstNode[] = [];
    for (const child of children) {
        const adapted = adaptNode(child);
        if (adapted) {
            result.push(adapted);
        }
    }
    return result;
}

function adaptNode(raw: RawNode): AstNode | undefined {
    if (!raw || !raw.kind) {
        return undefined;
    }

    switch (raw.kind) {
        case 'program':
            return adaptProgram(raw);
        case 'namespace':
            return adaptNamespace(raw);
        case 'class':
        case 'trait':
            return adaptClass(raw);
        case 'method':
            return adaptMethod(raw);
        case 'traituse':
            return adaptTraitUse(raw);
        case 'usegroup':
            return adaptUseGroup(raw);
        case 'useitem':
            return adaptUseItem(raw);
        case 'call':
            return adaptCall(raw);
        case 'expressionstatement':
            return adaptExpressionStatement(raw);
        case 'string':
            return { kind: 'string', value: raw.value ?? '', loc: convertLoc(raw.loc) };
        case 'namedargument':
            return adaptNamedArgument(raw);
        case 'closure':
            return adaptClosure(raw);
        case 'arrowfunc':
            return adaptArrowFunc(raw);
        case 'block':
            return {
                kind: 'compound_statement',
                children: adaptChildren(raw.children ?? []),
                loc: convertLoc(raw.loc),
            };
        case 'yield':
            return adaptYieldExpression(raw);
        case 'include':
            return { kind: 'include_expression', loc: convertLoc(raw.loc) };
        case 'array':
            return adaptArrayCreation(raw);
        case 'entry':
            return adaptArrayEntry(raw);
        case 'encapsed':
            return adaptEncapsedString(raw);
        case 'variable':
            return {
                kind: 'variable',
                name: extractName(raw.name ?? raw),
                loc: convertLoc(raw.loc),
            };
        case 'number':
            return {
                kind: 'number',
                value: Number(raw.value ?? 0),
                loc: convertLoc(raw.loc),
            };
        case 'staticlookup':
            return {
                kind: 'class_constant_access',
                scope: extractName(raw.what?.name ?? raw.what),
                name: extractName(raw.offset?.name ?? raw.offset),
                loc: convertLoc(raw.loc),
            };
        case 'bin':
            return {
                kind: 'binary_expression',
                operator: raw.type ?? '.',
                left: adaptNode(raw.left) ?? EMPTY_STRING_NODE,
                right: adaptNode(raw.right) ?? EMPTY_STRING_NODE,
                loc: convertLoc(raw.loc),
            };
        case 'retif':
            return {
                kind: 'conditional_expression',
                condition: adaptNode(raw.test) ?? EMPTY_STRING_NODE,
                consequent: adaptNode(raw.trueExpr) ?? EMPTY_STRING_NODE,
                alternate: adaptNode(raw.falseExpr) ?? EMPTY_STRING_NODE,
                loc: convertLoc(raw.loc),
            };
        case 'parenthesis':
            return raw.inner ? adaptNode(raw.inner) : undefined;
        default:
            return undefined;
    }
}

function adaptNamespace(raw: RawNode): AstNode {
    return {
        kind: 'namespace_definition',
        name: extractName(raw.name),
        children: adaptChildren(raw.children ?? []),
        loc: convertLoc(raw.loc),
    };
}

function adaptClass(raw: RawNode): AstNode {
    const body = adaptChildren(raw.body ?? []);

    // Include const declarations
    for (const child of raw.body ?? []) {
        if (child?.kind === 'classconstant') {
            for (const constant of child.constants ?? []) {
                body.push({
                    kind: 'const_declaration',
                    name: extractName(constant.name),
                    value: constant.value ? adaptNode(constant.value) : undefined,
                    loc: convertLoc(child.loc),
                } as AstNode);
            }
        }
    }

    return {
        kind: raw.kind === 'trait' ? 'trait_declaration' : 'class_declaration',
        name: extractName(raw.name),
        isAbstract: raw.isAbstract === true,
        extendsName: raw.extends ? extractName(raw.extends) : undefined,
        body,
        leadingComments: convertComments(raw.leadingComments),
        attrGroups: raw.attrGroups,
        loc: convertLoc(raw.loc) ?? zeroLoc,
    };
}

function adaptMethod(raw: RawNode): AstNode {
    return {
        kind: 'method_declaration',
        name: extractName(raw.name),
        visibility: raw.visibility ?? '',
        isAbstract: raw.isAbstract === true,
        body: raw.body ? adaptMethodBody(raw.body) : undefined,
        leadingComments: convertComments(raw.leadingComments),
        attrGroups: raw.attrGroups,
        loc: convertLoc(raw.loc) ?? zeroLoc,
    };
}

function tryAdaptYieldFromExpressionStatement(raw: RawNode): AstNode | null {
    if (raw.kind !== 'expressionstatement') {
        return null;
    }
    if (raw.expression?.kind !== 'yield') {
        return null;
    }
    return adaptYieldExpression(raw.expression);
}

function adaptMethodBody(body: RawNode): AstNode[] {
    const statements: AstNode[] = [];

    for (const child of body.children ?? []) {
        if (!child) continue;
        if (child.kind === 'return') {
            const value = child.expr ? adaptNode(child.expr) : undefined;
            statements.push({
                kind: 'return_statement',
                value,
                loc: convertLoc(child.loc),
            } as AstNode);
            continue;
        }
        if (child.kind === 'for') {
            statements.push(adaptForStatement(child));
            continue;
        }
        if (child.kind === 'foreach') {
            statements.push(adaptForeachStatement(child));
            continue;
        }
        if (child.kind === 'while') {
            statements.push(adaptWhileStatement(child));
            continue;
        }
        if (child.kind === 'if') {
            statements.push(adaptIfStatement(child));
            continue;
        }
        if (child.kind === 'break') {
            statements.push({ kind: 'break_statement', loc: convertLoc(child.loc) } as AstNode);
            continue;
        }
        if (child.kind === 'continue') {
            statements.push({ kind: 'continue_statement', loc: convertLoc(child.loc) } as AstNode);
            continue;
        }
        if (child.kind === 'expressionstatement' && child.expression?.kind === 'assign') {
            statements.push(adaptAssignment(child.expression));
            continue;
        }
        if (
            child.kind === 'expressionstatement' &&
            (child.expression?.kind === 'post' || child.expression?.kind === 'pre')
        ) {
            statements.push(adaptUpdateExpression(child.expression));
            continue;
        }
        const yieldNode = tryAdaptYieldFromExpressionStatement(child);
        if (yieldNode) {
            statements.push(yieldNode);
        }
    }

    return statements;
}

function adaptStatementBody(raw: RawNode): AstNode[] {
    if (!raw.body) {
        return [];
    }
    return raw.body.kind === 'block'
        ? adaptMethodBody(raw.body)
        : adaptMethodBody({ children: [raw.body] });
}

function adaptForStatement(raw: RawNode): AstNode {
    let init: { variable: string; value: AstNode } | undefined;
    let condition: { variable: string; operator: string; value: AstNode } | undefined;
    let update: { variable: string; operator: string } | undefined;

    // init: [{ kind: 'assign', left: { kind: 'variable', name: 'i' }, right: { kind: 'number', value: 0 } }]
    if (raw.init?.[0]?.kind === 'assign') {
        const assign = raw.init[0];
        init = {
            variable: extractName(assign.left?.name ?? assign.left),
            value: adaptNode(assign.right) ?? ZERO_NODE,
        };
    }

    // test: [{ kind: 'bin', type: '<', left: variable, right: number }]
    if (raw.test?.[0]) {
        const test = raw.test[0];
        condition = {
            variable: extractName(test.left?.name ?? test.left),
            operator: test.type ?? test.operator ?? '<',
            value: adaptNode(test.right) ?? ZERO_NODE,
        };
    }

    // increment: [{ kind: 'post', type: '+', what: variable }]
    if (raw.increment?.[0]) {
        const inc = raw.increment[0];
        update = {
            variable: extractName(inc.what?.name ?? inc.what),
            operator: inc.type === '+' ? '++' : '--',
        };
    }

    return {
        kind: 'for_statement',
        init,
        condition,
        update,
        body: adaptStatementBody(raw),
        loc: convertLoc(raw.loc),
    };
}

function adaptForeachStatement(raw: RawNode): AstNode {
    return {
        kind: 'foreach_statement',
        source: adaptNode(raw.source) ?? EMPTY_STRING_NODE,
        valueVariable: extractName(raw.value?.name ?? raw.value),
        body: adaptStatementBody(raw),
        loc: convertLoc(raw.loc),
    };
}

function adaptWhileStatement(raw: RawNode): AstNode {
    const test = raw.test;
    let condition: { variable: string; operator: string; value: AstNode } = {
        variable: '',
        operator: '<',
        value: ZERO_NODE,
    };
    if (test?.kind === 'bin') {
        condition = {
            variable: extractName(test.left?.name ?? test.left),
            operator: test.type ?? test.operator ?? '<',
            value: adaptNode(test.right) ?? ZERO_NODE,
        };
    }
    return {
        kind: 'while_statement',
        condition,
        body: adaptStatementBody(raw),
        loc: convertLoc(raw.loc),
    };
}

function adaptIfStatement(raw: RawNode): AstNode {
    const condition = raw.test ? adaptNode(raw.test) : EMPTY_STRING_NODE;
    const body = adaptStatementBody(raw);
    const elseBody = raw.alternate ? adaptStatementBody(raw.alternate) : undefined;

    return {
        kind: 'if_statement',
        condition: condition ?? EMPTY_STRING_NODE,
        body,
        elseBody,
        loc: convertLoc(raw.loc),
    } as AstNode;
}

function adaptAssignment(raw: RawNode): AstNode {
    return {
        kind: 'assignment_expression',
        operator: raw.operator !== '=' ? raw.operator : undefined,
        variable: extractName(raw.left?.name ?? raw.left),
        value: adaptNode(raw.right) ?? ZERO_NODE,
        loc: convertLoc(raw.loc),
    };
}

function adaptUpdateExpression(raw: RawNode): AstNode {
    return {
        kind: 'update_expression',
        variable: extractName(raw.what?.name ?? raw.what),
        operator: raw.type === '+' ? '++' : '--',
        loc: convertLoc(raw.loc),
    };
}

function adaptYieldExpression(raw: RawNode): AstNode {
    return {
        kind: 'yield_expression',
        key: raw.key ? adaptNode(raw.key) : undefined,
        value: raw.value ? adaptNode(raw.value) : undefined,
        loc: convertLoc(raw.loc),
    } as AstNode;
}

function adaptTraitUse(raw: RawNode): AstNode {
    const traits = (raw.traits ?? []).map((t: RawNode) => extractName(t));
    const adaptations = (raw.adaptations ?? [])
        .map((a: RawNode) => adaptTraitAdaptation(a))
        .filter(Boolean);

    return {
        kind: 'use_declaration',
        traits,
        adaptations,
        loc: convertLoc(raw.loc),
    };
}

function adaptTraitAdaptation(raw: RawNode): AstNode | undefined {
    if (raw.kind === 'traitprecedence') {
        return {
            kind: 'use_instead_of_clause',
            trait: raw.trait ? extractName(raw.trait) : undefined,
            method: extractName(raw.method),
            instead: (raw.instead ?? []).map((i: RawNode) => extractName(i)),
        };
    }

    if (raw.kind === 'traitalias') {
        return {
            kind: 'use_as_clause',
            trait: raw.trait ? extractName(raw.trait) : undefined,
            method: extractName(raw.method),
            alias: raw.as ? extractName(raw.as) : undefined,
            visibility: raw.visibility || undefined,
        };
    }

    return undefined;
}

function adaptUseGroup(raw: RawNode): AstNode {
    const items: UseItemNode[] = [];
    for (const item of raw.items ?? []) {
        if (item.kind === 'useitem') {
            items.push({
                kind: 'namespace_use_clause',
                name: extractName(item.name),
                loc: convertLoc(item.loc),
            });
        }
    }

    return {
        kind: 'namespace_use_declaration',
        items,
        loc: convertLoc(raw.loc),
    };
}

function adaptUseItem(raw: RawNode): AstNode {
    return {
        kind: 'namespace_use_clause',
        name: extractName(raw.name),
        loc: convertLoc(raw.loc),
    };
}

function adaptCall(raw: RawNode): CallNode {
    const args = (raw.arguments ?? [])
        .map((a: RawNode) => adaptNode(a))
        .filter(Boolean) as AstNode[];

    const { name, chain } = resolveCallChain(raw.what);

    return {
        kind: 'function_call_expression',
        name,
        arguments: args,
        chain,
        loc: convertLoc(raw.loc) ?? zeroLoc,
    };
}

function toCallNode(raw: RawNode): CallNode {
    if (raw.kind === 'call') {
        return adaptCall(raw);
    }
    return {
        kind: 'function_call_expression',
        name: extractName(raw),
        arguments: [],
        loc: convertLoc(raw?.loc) ?? zeroLoc,
    };
}

function resolveCallChain(what: RawNode): { name: string; chain?: CallNode } {
    if (!what) {
        return { name: '' };
    }

    if (what.kind === 'name' || what.kind === 'identifier') {
        return { name: extractName(what) };
    }

    // propertylookup: arch()->preset()->php()
    if (what.kind === 'propertylookup') {
        const methodName = what.offset ? extractName(what.offset) : '';
        const inner = what.what;
        const chain = inner ? toCallNode(inner) : undefined;

        return { name: methodName, chain };
    }

    if (what.kind === 'call') {
        const innerCall = adaptCall(what);
        return { name: '', chain: innerCall };
    }

    return { name: extractName(what) };
}

function adaptExpressionStatement(raw: RawNode): AstNode {
    // Yield inside closure body must be promoted to top-level yield_expression,
    // not wrapped in expression_statement (same as adaptMethodBody).
    const yieldNode = tryAdaptYieldFromExpressionStatement(raw);
    if (yieldNode) {
        return yieldNode;
    }
    const adapted = adaptNode(raw.expression);
    return {
        kind: 'expression_statement',
        expression: adapted ?? { kind: 'include_expression', loc: convertLoc(raw.loc) },
        loc: convertLoc(raw.loc),
    };
}

function adaptNamedArgument(raw: RawNode): AstNode {
    return {
        kind: 'argument',
        name: typeof raw.name === 'string' ? raw.name : extractName(raw.name),
        value: adaptNode(raw.value) ?? { kind: 'string', value: '', loc: convertLoc(raw.loc) },
        loc: convertLoc(raw.loc),
    };
}

function adaptClosure(raw: RawNode): AstNode {
    const body = raw.body;
    const fallback: AstNode = {
        kind: 'compound_statement',
        children: [],
        loc: convertLoc(raw.loc),
    };
    return {
        kind: 'anonymous_function',
        body: body ? (adaptNode(body) ?? fallback) : fallback,
        loc: convertLoc(raw.loc),
    };
}

function adaptArrowFunc(raw: RawNode): AstNode {
    const body = raw.body;
    const fallback: AstNode = {
        kind: 'compound_statement',
        children: [],
        loc: convertLoc(raw.loc),
    };
    return {
        kind: 'arrow_function',
        body: body ? (adaptNode(body) ?? fallback) : fallback,
        loc: convertLoc(raw.loc),
    };
}

function adaptEncapsedString(raw: RawNode): AstNode {
    const parts: AstNode[] = [];
    for (const part of raw.value ?? []) {
        if (part.kind === 'encapsedpart') {
            const expr = part.expression;
            if (expr) {
                const adapted = adaptNode(expr);
                if (adapted) {
                    parts.push(adapted);
                }
            }
        } else {
            const adapted = adaptNode(part);
            if (adapted) {
                parts.push(adapted);
            }
        }
    }
    return { kind: 'encapsed_string', parts, loc: convertLoc(raw.loc) };
}

function adaptArrayCreation(raw: RawNode): AstNode {
    const entries = (raw.items ?? [])
        .map((item: RawNode) => adaptNode(item))
        .filter(Boolean) as ArrayEntryNode[];

    return {
        kind: 'array_creation_expression',
        entries,
        loc: convertLoc(raw.loc),
    };
}

function adaptArrayEntry(raw: RawNode): AstNode {
    const key = raw.key ? adaptNode(raw.key) : undefined;
    const value = adaptNode(raw.value) ?? { kind: 'string', value: '', loc: convertLoc(raw.loc) };

    return {
        kind: 'array_element_initializer',
        key,
        value,
        loc: convertLoc(raw.loc),
    };
}

function extractName(node: RawNode): string {
    if (!node) {
        return '';
    }
    if (typeof node === 'string') {
        return node;
    }
    if (node.name) {
        return extractName(node.name);
    }
    return '';
}
