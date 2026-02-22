import type { ArrayEntryNode, AstNode, AstNodeLoc, CallNode, UseItemNode } from '../AstNode';

// biome-ignore lint/suspicious/noExplicitAny: Raw php-parser AST nodes are untyped
type RawNode = any;

function convertLoc(loc: RawNode): AstNodeLoc | undefined {
    if (!loc) {
        return undefined;
    }
    return {
        start: { row: loc.start.line - 1, column: loc.start.column },
        end: { row: loc.end.line - 1, column: loc.end.column },
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
    return {
        kind: raw.kind === 'trait' ? 'trait_declaration' : 'class_declaration',
        name: extractName(raw.name),
        isAbstract: raw.isAbstract === true,
        extendsName: raw.extends ? extractName(raw.extends) : undefined,
        body: adaptChildren(raw.body ?? []),
        leadingComments: convertComments(raw.leadingComments),
        attrGroups: raw.attrGroups,
        loc: convertLoc(raw.loc),
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
        loc: convertLoc(raw.loc),
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
        const yieldNode = tryAdaptYieldFromExpressionStatement(child);
        if (yieldNode) {
            statements.push(yieldNode);
        }
    }

    return statements;
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
        loc: convertLoc(raw.loc),
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
        loc: convertLoc(raw?.loc),
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
