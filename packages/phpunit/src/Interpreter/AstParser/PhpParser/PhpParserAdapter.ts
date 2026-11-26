import type {
    ArrayEntryNode,
    AstNode,
    AstNodeAttrGroup,
    AstNodeAttribute,
    AstNodeComment,
    AstNodeLoc,
    CallNode,
    UseItemNode,
} from '../AstNode';

// biome-ignore lint/suspicious/noExplicitAny: Raw php-parser AST nodes are untyped
type RawNode = any;

const ZERO_NODE = { kind: 'number', value: 0 } as AstNode;
const EMPTY_STRING_NODE = { kind: 'string', value: '' } as AstNode;
const zeroLoc: AstNodeLoc = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

let source = '';

function convertLoc(loc: RawNode): AstNodeLoc | undefined {
    if (!loc) {
        return undefined;
    }
    return {
        start: { line: loc.start.line, character: loc.start.column },
        end: { line: loc.end.line, character: loc.end.column },
    };
}

const TRIVIA = /^(?:\s+|\/\*[\s\S]*?\*\/|\/\/[^\n]*|#(?!\[)[^\n]*)*/;

function declarationLoc(raw: RawNode): RawNode {
    const groups = raw.attrGroups;
    const lastEnd = groups?.[groups.length - 1]?.loc?.end;
    if (!raw.loc || !lastEnd || lastEnd.offset === undefined) {
        return raw.loc;
    }

    const skipped = lastEnd.offset - raw.loc.start.offset;
    if (skipped < 0) {
        return raw.loc;
    }

    const trivia = (raw.loc.source ?? '').slice(skipped).match(TRIVIA)?.[0] ?? '';
    const newlineCount = (trivia.match(/\n/g) ?? []).length;
    const lastNewline = trivia.lastIndexOf('\n');

    return {
        ...raw.loc,
        start: {
            line: lastEnd.line + newlineCount,
            column:
                newlineCount > 0 ? trivia.length - lastNewline - 1 : lastEnd.column + trivia.length,
            offset: lastEnd.offset + trivia.length,
        },
    };
}

function convertComments(comments: RawNode[] | undefined): AstNodeComment[] {
    return (comments ?? []).map((c: RawNode) => ({
        kind: 'comment',
        value: c.value,
        loc: convertLoc(c.loc),
    }));
}

export function adapt(raw: RawNode): AstNode {
    source = raw.loc?.source ?? '';
    return adaptProgram(raw);
}

function positionAt(offset: number): RawNode {
    const before = source.slice(0, offset);
    return {
        line: (before.match(/\n/g) ?? []).length + 1,
        column: offset - (before.lastIndexOf('\n') + 1),
        offset,
    };
}

function withoutTrailingSemicolon(loc: RawNode): RawNode {
    if (!loc?.source?.endsWith(';')) {
        return loc;
    }
    return { ...loc, end: positionAt(loc.end.offset - 1) };
}

function withTrailingSemicolon(loc: RawNode): RawNode {
    if (!loc || source[loc.end.offset] !== ';') {
        return loc;
    }
    return { ...loc, end: positionAt(loc.end.offset + 1) };
}

function namespaceStatementLoc(raw: RawNode): RawNode {
    if (raw.withBrackets || !raw.loc) {
        return raw.loc;
    }
    const semicolon = source.indexOf(';', raw.loc.start.offset);
    if (semicolon === -1) {
        return raw.loc;
    }
    return { ...raw.loc, end: positionAt(semicolon + 1) };
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
    if (!raw?.kind) {
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
            return adaptNumber(raw);
        case 'boolean':
            return { kind: 'boolean', value: raw.value === true, loc: convertLoc(raw.loc) };
        case 'nullkeyword':
            return { kind: 'null', loc: convertLoc(raw.loc) };
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
                left: adaptExpression(raw.left),
                right: adaptExpression(raw.right),
                loc: convertLoc(raw.loc),
            };
        case 'unary':
            return {
                kind: 'unary_expression',
                operator: raw.type,
                operand: adaptExpression(raw.what),
                loc: convertLoc(raw.loc),
            };
        case 'retif':
            return {
                kind: 'conditional_expression',
                condition: adaptExpression(raw.test),
                consequent: adaptExpression(raw.trueExpr),
                alternate: adaptExpression(raw.falseExpr),
                loc: convertLoc(raw.loc),
            };
        case 'offsetlookup':
            return {
                kind: 'subscript_access_expression',
                object: adaptNode(raw.what) ?? EMPTY_STRING_NODE,
                index: adaptNode(raw.offset) ?? EMPTY_STRING_NODE,
                loc: convertLoc(raw.loc),
            };
        case 'parenthesis':
            return raw.inner ? adaptNode(raw.inner) : undefined;
        case 'assign':
            return adaptAssignment(raw);
        default:
            return undefined;
    }
}

function adaptExpression(raw: RawNode): AstNode {
    return adaptNode(raw) ?? { kind: 'unsupported_expression', loc: convertLoc(raw?.loc) };
}

function adaptNumber(raw: RawNode): AstNode {
    const text = String(raw.value ?? 0);
    const isFloat = !/^0[xb]/i.test(text) && /[.e]/i.test(text);
    return {
        kind: isFloat ? 'float' : 'number',
        value: Number(text),
        loc: convertLoc(raw.loc),
    };
}

function adaptNamespace(raw: RawNode): AstNode {
    return {
        kind: 'namespace_definition',
        name: extractName(raw.name),
        children: adaptChildren(raw.children ?? []),
        loc: convertLoc(namespaceStatementLoc(raw)),
    };
}

function adaptClass(raw: RawNode): AstNode {
    const body: AstNode[] = [];

    for (const child of raw.body ?? []) {
        if (child?.kind !== 'classconstant') {
            const adapted = adaptNode(child);
            if (adapted) {
                body.push(adapted);
            }
            continue;
        }

        for (const constant of child.constants ?? []) {
            body.push({
                kind: 'const_declaration',
                name: extractName(constant.name),
                value: constant.value ? adaptNode(constant.value) : undefined,
                loc: convertLoc(withTrailingSemicolon(child.loc)),
            } as AstNode);
        }
    }

    return {
        kind: raw.kind === 'trait' ? 'trait_declaration' : 'class_declaration',
        name: extractName(raw.name),
        isAbstract: raw.isAbstract === true,
        extendsName: raw.extends ? extractName(raw.extends) : undefined,
        body,
        leadingComments: declarationComments(raw),
        attrGroups: adaptAttrGroups(raw.attrGroups),
        loc: convertLoc(declarationLoc(raw)) ?? zeroLoc,
    };
}

function declarationComments(raw: RawNode): AstNodeComment[] {
    const attributeComments = (raw.attrGroups ?? []).flatMap(
        (group: RawNode) => group.leadingComments ?? [],
    );
    return convertComments([...attributeComments, ...(raw.leadingComments ?? [])]);
}

function adaptAttrGroups(groups: RawNode[] | undefined): AstNodeAttrGroup[] {
    return (groups ?? [])
        .map((group: RawNode) => ({
            attrs: (group.attrs ?? []).map(
                (attr: RawNode): AstNodeAttribute => ({
                    name: extractName(attr.name),
                    args: adaptChildren(attr.args ?? []),
                }),
            ),
        }))
        .filter((group: AstNodeAttrGroup) => group.attrs.length > 0);
}

function adaptMethod(raw: RawNode): AstNode {
    return {
        kind: 'method_declaration',
        name: extractName(raw.name),
        visibility: raw.visibility ?? '',
        isAbstract: raw.isAbstract === true,
        body: raw.body ? adaptMethodBody(raw.body) : undefined,
        leadingComments: declarationComments(raw),
        attrGroups: adaptAttrGroups(raw.attrGroups),
        loc: convertLoc(declarationLoc(raw)) ?? zeroLoc,
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
        const statement = adaptBodyStatement(child);
        if (statement) {
            statements.push(statement);
        }
    }

    return statements;
}

function adaptReturnStatement(raw: RawNode): AstNode {
    const value = raw.expr ? adaptNode(raw.expr) : undefined;
    return {
        kind: 'return_statement',
        value,
        loc: convertLoc(raw.loc),
    } as AstNode;
}

function adaptBodyStatement(raw: RawNode): AstNode | null {
    switch (raw.kind) {
        case 'return':
            return adaptReturnStatement(raw);
        case 'for':
            return adaptForStatement(raw);
        case 'foreach':
            return adaptForeachStatement(raw);
        case 'while':
            return adaptWhileStatement(raw);
        case 'if':
            return adaptIfStatement(raw);
        case 'break':
            return { kind: 'break_statement', loc: convertLoc(raw.loc) } as AstNode;
        case 'continue':
            return { kind: 'continue_statement', loc: convertLoc(raw.loc) } as AstNode;
        case 'expressionstatement':
            return adaptBodyExpressionStatement(raw);
        default:
            return null;
    }
}

function adaptBodyExpressionStatement(raw: RawNode): AstNode | null {
    const kind = raw.expression?.kind;
    if (kind === 'assign') {
        return adaptAssignment(raw.expression);
    }
    if (kind === 'post' || kind === 'pre') {
        return adaptUpdateExpression(raw.expression);
    }
    return tryAdaptYieldFromExpressionStatement(raw);
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

    if (raw.init?.[0]?.kind === 'assign') {
        const assign = raw.init[0];
        init = {
            variable: extractName(assign.left?.name ?? assign.left),
            value: adaptExpression(assign.right),
        };
    }

    if (raw.test?.[0]) {
        const test = raw.test[0];
        condition = {
            variable: extractName(test.left?.name ?? test.left),
            operator: test.type ?? test.operator ?? '<',
            value: adaptExpression(test.right),
        };
    }

    if (raw.increment?.[0]?.kind === 'post' || raw.increment?.[0]?.kind === 'pre') {
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
        keyVariable: raw.key ? extractName(raw.key.name ?? raw.key) : undefined,
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
            value: adaptExpression(test.right),
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
        value: adaptExpression(raw.right),
        loc: convertLoc(withoutTrailingSemicolon(raw.loc)),
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
        key: raw.key ? adaptExpression(raw.key) : undefined,
        value: raw.value ? adaptExpression(raw.value) : undefined,
        loc: convertLoc(withoutTrailingSemicolon(raw.loc)),
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
    const prefix = raw.name ? extractName(raw.name) : undefined;
    const items: UseItemNode[] = [];
    for (const item of raw.items ?? []) {
        if (item.kind === 'useitem') {
            const name = extractName(item.name);
            items.push({
                kind: 'namespace_use_clause',
                name: prefix ? `${prefix}\\${name}` : name,
                alias: item.alias ? extractName(item.alias) : undefined,
                loc: convertLoc(item.loc),
            });
        }
    }

    return {
        kind: 'namespace_use_declaration',
        items,
        loc: convertLoc(withTrailingSemicolon(raw.loc)),
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
    const args = (raw.arguments ?? []).map((a: RawNode) => adaptExpression(a));

    const { name, chain } = resolveCallChain(raw.what);

    return {
        kind: 'function_call_expression',
        name,
        arguments: args,
        chain,
        loc: convertLoc(withoutTrailingSemicolon(raw.loc)) ?? zeroLoc,
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
        value: adaptExpression(raw.value),
        loc: convertLoc(raw.loc),
    };
}

function adaptClosure(raw: RawNode): AstNode {
    const body = raw.body;
    return {
        kind: 'anonymous_function',
        body: {
            kind: 'compound_statement',
            children: body ? adaptClosureBody(body) : [],
            loc: convertLoc(body?.loc ?? raw.loc),
        },
        loc: convertLoc(raw.loc),
    };
}

function adaptClosureBody(body: RawNode): AstNode[] {
    const statements: AstNode[] = [];
    for (const child of body.children ?? []) {
        const statement = adaptBodyStatement(child) ?? adaptNode(child);
        if (statement) {
            statements.push(statement);
        }
    }
    return statements;
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
    const key = raw.key ? adaptExpression(raw.key) : undefined;
    const value = adaptExpression(raw.value);

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
