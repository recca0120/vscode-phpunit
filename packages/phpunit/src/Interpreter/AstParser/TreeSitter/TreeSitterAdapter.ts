import type { Node as SyntaxNode } from '@vscode/tree-sitter-wasm';
import type {
    ArrayEntryNode,
    AstNode,
    AstNodeAttrGroup,
    AstNodeAttribute,
    AstNodeComment,
    AstNodeLoc,
    CallNode,
    NamespaceNode,
    TraitAdaptationNode,
    UseItemNode,
} from '../AstNode';

function locOf(node: SyntaxNode): AstNodeLoc {
    return {
        start: { line: node.startPosition.row + 1, character: node.startPosition.column },
        end: { line: node.endPosition.row + 1, character: node.endPosition.column },
    };
}

const ZERO_NODE = { kind: 'number', value: 0 } as AstNode;
const EMPTY_STRING_NODE = { kind: 'string', value: '' } as AstNode;

function collectLeadingComments(node: SyntaxNode): AstNodeComment[] {
    const comments: AstNodeComment[] = [];

    for (const child of node.children) {
        if (!child) continue;
        if (child.type === 'comment') {
            comments.push({
                kind: 'comment',
                value: child.text,
                loc: locOf(child),
            });
        }
    }

    if (comments.length > 0) {
        return comments;
    }

    let prev: SyntaxNode | null = node.previousSibling;
    const rawComments: SyntaxNode[] = [];
    while (prev) {
        if (prev.type === 'comment') {
            rawComments.unshift(prev);
            prev = prev.previousSibling;
        } else {
            break;
        }
    }

    for (const c of rawComments) {
        comments.push({
            kind: 'comment',
            value: c.text,
            loc: locOf(c),
        });
    }

    return comments;
}

function collectAttrGroups(node: SyntaxNode): AstNodeAttrGroup[] {
    const attrGroups: AstNodeAttrGroup[] = [];

    for (const child of node.children) {
        if (child?.type !== 'attribute_list') continue;

        for (const group of child.children) {
            if (group?.type !== 'attribute_group') continue;

            const attrs = group.namedChildren
                .filter(
                    (attr): attr is NonNullable<typeof attr> => !!attr && attr.type === 'attribute',
                )
                .map(parseAttribute);

            if (attrs.length > 0) {
                attrGroups.push({ attrs });
            }
        }
    }

    return attrGroups;
}

function parseAttribute(attr: SyntaxNode): AstNodeAttribute {
    const nameNode = attr.childForFieldName('name') ?? attr.namedChildren[0];
    const argList =
        attr.childForFieldName('parameters') ?? attr.children.find((c) => c?.type === 'arguments');

    return {
        name: nameNode ? nameNode.text : '',
        args: argList ? adaptArguments(argList) : [],
    };
}

function adaptVisibility(node: SyntaxNode): string {
    for (const child of node.children) {
        if (!child) continue;
        if (child.type === 'visibility_modifier') {
            return child.text;
        }
    }
    return '';
}

function isAbstract(node: SyntaxNode): boolean {
    for (const child of node.children) {
        if (!child) continue;
        if (child.type === 'abstract_modifier') {
            return true;
        }
    }
    return false;
}

function getDeclarationLoc(node: SyntaxNode): AstNodeLoc {
    for (const child of node.children) {
        if (!child) continue;
        if (child.type !== 'attribute_list' && child.type !== 'comment') {
            return {
                start: { line: child.startPosition.row + 1, character: child.startPosition.column },
                end: { line: node.endPosition.row + 1, character: node.endPosition.column },
            };
        }
    }
    return locOf(node);
}

function adaptNamespaceUse(node: SyntaxNode): AstNode {
    const prefix = node.namedChildren.find((child) => child?.type === 'namespace_name')?.text;
    const group = node.namedChildren.find((child) => child?.type === 'namespace_use_group');
    const clauses = (group ?? node).namedChildren.filter(
        (child): child is SyntaxNode => child?.type === 'namespace_use_clause',
    );

    return {
        kind: 'namespace_use_declaration',
        items: clauses.flatMap((clause) => adaptUseClause(clause, prefix)),
        loc: locOf(node),
    };
}

function adaptUseClause(clause: SyntaxNode, prefix: string | undefined): UseItemNode[] {
    const nameNode = clause.namedChildren[0];
    if (!nameNode) {
        return [];
    }

    return [
        {
            kind: 'namespace_use_clause',
            name: prefix ? `${prefix}\\${nameNode.text}` : nameNode.text,
            alias: clause.childForFieldName('alias')?.text,
            loc: locOf(clause),
        },
    ];
}

function adaptTraitUse(node: SyntaxNode): AstNode {
    const traits: string[] = [];
    const adaptations: TraitAdaptationNode[] = [];

    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type === 'name' || child.type === 'qualified_name') {
            traits.push(child.text);
        } else if (child.type === 'use_list') {
            for (const item of child.namedChildren) {
                if (!item) continue;
                if (item.type === 'use_instead_of_clause') {
                    adaptations.push(adaptInsteadOf(item));
                } else if (item.type === 'use_as_clause') {
                    adaptations.push(adaptAsAlias(item));
                }
            }
        }
    }

    return {
        kind: 'use_declaration',
        traits,
        adaptations,
        loc: locOf(node),
    };
}

function adaptInsteadOf(node: SyntaxNode): TraitAdaptationNode {
    let trait: string | undefined;
    let method = '';
    const instead: string[] = [];

    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type === 'class_constant_access_expression') {
            const parts = child.namedChildren;
            trait = parts[0]?.text;
            method = parts[1]?.text ?? '';
        } else if (child.type === 'name' || child.type === 'qualified_name') {
            instead.push(child.text);
        }
    }

    return {
        kind: 'use_instead_of_clause',
        trait,
        method,
        instead,
    };
}

function adaptAsAlias(node: SyntaxNode): TraitAdaptationNode {
    let trait: string | undefined;
    let method = '';
    let alias: string | undefined;
    let visibility: string | undefined;

    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type === 'class_constant_access_expression') {
            const parts = child.namedChildren;
            trait = parts[0]?.text;
            method = parts[1]?.text ?? '';
        } else if (child.type === 'visibility_modifier') {
            visibility = child.text;
        } else if (child.type === 'name') {
            if (!method) {
                method = child.text;
            } else {
                alias = child.text;
            }
        }
    }

    return {
        kind: 'use_as_clause',
        trait,
        method,
        alias,
        visibility,
    };
}

function adaptMethod(node: SyntaxNode): AstNode {
    const nameNode = node.childForFieldName('name');
    const bodyNode = node.childForFieldName('body');

    return {
        kind: 'method_declaration',
        name: nameNode ? nameNode.text : '',
        visibility: adaptVisibility(node),
        isAbstract: isAbstract(node),
        body: bodyNode ? adaptMethodBody(bodyNode) : undefined,
        leadingComments: collectLeadingComments(node),
        attrGroups: collectAttrGroups(node),
        loc: getDeclarationLoc(node),
    };
}

function tryAdaptYieldFromStatement(node: SyntaxNode): AstNode | null {
    if (node.type !== 'expression_statement') {
        return null;
    }
    const expr = node.namedChildren[0];
    if (expr?.type !== 'yield_expression') {
        return null;
    }
    return adaptYield(expr);
}

function adaptMethodBody(bodyNode: SyntaxNode): AstNode[] {
    const statements: AstNode[] = [];

    for (const child of bodyNode.namedChildren) {
        if (!child) continue;
        const statement = adaptBodyStatement(child);
        if (statement) {
            statements.push(statement);
        }
    }

    return statements;
}

function adaptReturnStatement(node: SyntaxNode): AstNode {
    const valNode = node.namedChildren[0];
    return {
        kind: 'return_statement',
        value: valNode ? adaptExpression(valNode) : undefined,
        loc: locOf(node),
    };
}

function adaptBodyStatement(node: SyntaxNode): AstNode | null {
    switch (node.type) {
        case 'return_statement':
            return adaptReturnStatement(node);
        case 'for_statement':
            return adaptForStatement(node);
        case 'foreach_statement':
            return adaptForeachStatement(node);
        case 'while_statement':
            return adaptWhileStatement(node);
        case 'if_statement':
            return adaptIfStatement(node);
        case 'break_statement':
            return { kind: 'break_statement', loc: locOf(node) };
        case 'continue_statement':
            return { kind: 'continue_statement', loc: locOf(node) };
        case 'expression_statement':
            return adaptBodyExpressionStatement(node);
        default:
            return null;
    }
}

function adaptBodyExpressionStatement(node: SyntaxNode): AstNode | null {
    const expr = node.namedChildren[0];
    if (expr?.type === 'assignment_expression') {
        return adaptAssignment(expr);
    }
    if (expr?.type === 'augmented_assignment_expression') {
        return adaptAugmentedAssignment(expr);
    }
    if (expr?.type === 'update_expression') {
        return adaptUpdateExpression(expr);
    }
    return tryAdaptYieldFromStatement(node);
}

function adaptForStatement(node: SyntaxNode): AstNode {
    let init: { variable: string; value: AstNode } | undefined;
    let condition: { variable: string; operator: string; value: AstNode } | undefined;
    let update: { variable: string; operator: string } | undefined;

    for (const child of node.children) {
        if (!child) continue;
        switch (child.type) {
            case 'assignment_expression':
                init = parseForInit(child);
                break;
            case 'binary_expression':
                condition = parseForCondition(child);
                break;
            case 'update_expression':
                update = parseForUpdate(child);
                break;
        }
    }

    const bodyNode = node.childForFieldName('body');

    return {
        kind: 'for_statement',
        init,
        condition,
        update,
        body: bodyNode ? adaptMethodBody(bodyNode) : [],
        loc: locOf(node),
    };
}

function parseForInit(node: SyntaxNode): { variable: string; value: AstNode } | undefined {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    if (!left || !right) return undefined;
    return { variable: left.text.replace(/^\$/, ''), value: adaptExpression(right) };
}

function parseForCondition(
    node: SyntaxNode,
): { variable: string; operator: string; value: AstNode } | undefined {
    const left = node.childForFieldName('left');
    const op = node.childForFieldName('operator');
    const right = node.childForFieldName('right');
    if (!left || !op || !right) return undefined;
    return {
        variable: left.text.replace(/^\$/, ''),
        operator: op.text,
        value: adaptExpression(right),
    };
}

function parseForUpdate(node: SyntaxNode): { variable: string; operator: string } | undefined {
    const varName = node.namedChildren[0];
    if (!varName) return undefined;
    return {
        variable: varName.text.replace(/^\$/, ''),
        operator: node.text.endsWith('++') ? '++' : '--',
    };
}

function adaptForeachStatement(node: SyntaxNode): AstNode {
    let source: AstNode = EMPTY_STRING_NODE;
    let valueVariable = '';
    let keyVariable: string | undefined;
    let foundAs = false;

    for (const child of node.children) {
        if (!child) continue;
        if (!foundAs && child.isNamed) {
            source = adaptExpression(child);
        } else if (child.type === 'as') {
            foundAs = true;
        } else if (foundAs && child.type === 'variable_name') {
            valueVariable = child.text.replace(/^\$/, '');
        } else if (foundAs && child.type === 'pair') {
            const [keyNode, valueNode] = child.namedChildren;
            keyVariable = keyNode?.text.replace(/^\$/, '');
            valueVariable = valueNode?.text.replace(/^\$/, '') ?? '';
        }
    }

    const bodyNode = node.childForFieldName('body');

    return {
        kind: 'foreach_statement',
        source,
        valueVariable,
        keyVariable,
        body: bodyNode ? adaptMethodBody(bodyNode) : [],
        loc: locOf(node),
    };
}

function adaptWhileStatement(node: SyntaxNode): AstNode {
    const condNode = node.namedChildren.find((c) => c?.type === 'parenthesized_expression');
    let condition: { variable: string; operator: string; value: AstNode } | undefined;

    if (condNode) {
        const binExpr = condNode.namedChildren.find((c) => c?.type === 'binary_expression');
        if (binExpr) {
            condition = parseForCondition(binExpr);
        }
    }

    const bodyNode = node.childForFieldName('body');

    return {
        kind: 'while_statement',
        condition: condition ?? {
            variable: '',
            operator: '<',
            value: ZERO_NODE,
        },
        body: bodyNode ? adaptMethodBody(bodyNode) : [],
        loc: locOf(node),
    };
}

function adaptIfStatement(node: SyntaxNode): AstNode {
    const condNode = node.childForFieldName('condition');
    const bodyNode = node.childForFieldName('body');
    const altNode = node.childForFieldName('alternative');

    const condition = condNode ? adaptExpression(condNode) : EMPTY_STRING_NODE;

    const body = bodyNode ? adaptMethodBody(bodyNode) : [];
    const elseBody = altNode ? adaptMethodBody(altNode) : undefined;

    return {
        kind: 'if_statement',
        condition,
        body,
        elseBody,
        loc: locOf(node),
    };
}

function adaptAssignment(node: SyntaxNode): AstNode {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    return {
        kind: 'assignment_expression',
        variable: left?.text.replace(/^\$/, '') ?? '',
        value: right ? adaptExpression(right) : ZERO_NODE,
        loc: locOf(node),
    };
}

function adaptAugmentedAssignment(node: SyntaxNode): AstNode {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    const operator = node.children.find((c) => c !== null && !c.isNamed)?.type;
    return {
        kind: 'assignment_expression',
        operator,
        variable: left?.text.replace(/^\$/, '') ?? '',
        value: right ? adaptExpression(right) : ZERO_NODE,
        loc: locOf(node),
    };
}

function adaptUpdateExpression(node: SyntaxNode): AstNode {
    const varNode = node.namedChildren.find((c) => c?.type === 'variable_name');
    return {
        kind: 'update_expression',
        variable: varNode?.text.replace(/^\$/, '') ?? '',
        operator: node.text.includes('++') ? '++' : '--',
        loc: locOf(node),
    };
}

function adaptYield(node: SyntaxNode): AstNode {
    const children = node.namedChildren.filter((c): c is NonNullable<typeof c> => !!c);

    const entry =
        children.length === 1 && children[0].type === 'array_element_initializer'
            ? children[0].namedChildren.filter((c): c is NonNullable<typeof c> => !!c)
            : children;
    const [keyNode, valueNode] = entry.length === 2 ? entry : [undefined, entry[0]];

    return {
        kind: 'yield_expression',
        key: keyNode ? adaptExpression(keyNode) : undefined,
        value: valueNode ? adaptExpression(valueNode) : undefined,
        loc: locOf(node),
    };
}

function adaptClass(node: SyntaxNode): AstNode {
    const nameNode = node.childForFieldName('name');
    const baseClause = node.children.find((c) => c?.type === 'base_clause');
    let extendsName: string | undefined;

    if (baseClause) {
        const extName = baseClause.namedChildren[0];
        if (extName) {
            extendsName = extName.text;
        }
    }

    const bodyNode = node.childForFieldName('body');
    const body = bodyNode ? adaptClassBody(bodyNode) : [];

    return {
        kind: node.type === 'trait_declaration' ? 'trait_declaration' : 'class_declaration',
        name: nameNode ? nameNode.text : '',
        isAbstract: isAbstract(node),
        extendsName,
        body,
        leadingComments: collectLeadingComments(node),
        attrGroups: collectAttrGroups(node),
        loc: getDeclarationLoc(node),
    };
}

function adaptClassBody(bodyNode: SyntaxNode): AstNode[] {
    const result: AstNode[] = [];

    for (const child of bodyNode.namedChildren) {
        if (!child) continue;
        if (child.type === 'method_declaration') {
            result.push(adaptMethod(child));
        } else if (child.type === 'use_declaration') {
            result.push(adaptTraitUse(child));
        } else if (child.type === 'const_declaration') {
            const nameNode = child.namedChildren.find((c) => c?.type === 'const_element');
            if (nameNode) {
                const constName =
                    nameNode.childForFieldName('name')?.text ??
                    nameNode.namedChildren[0]?.text ??
                    '';
                const valueNode = nameNode.childForFieldName('value') ?? nameNode.namedChildren[1];
                result.push({
                    kind: 'const_declaration',
                    name: constName,
                    value: valueNode ? adaptExpression(valueNode) : undefined,
                    loc: locOf(child),
                });
            }
        }
    }

    return result;
}

function adaptCall(node: SyntaxNode): CallNode {
    const funcNode = node.childForFieldName('function');
    const argsNode = node.childForFieldName('arguments');
    const args = argsNode ? adaptArguments(argsNode) : [];

    const { name, chain } = resolveCallInfo(funcNode);

    return {
        kind: 'function_call_expression',
        name,
        arguments: args,
        chain,
        loc: locOf(node),
    };
}

function toCallNode(node: SyntaxNode): CallNode {
    if (node.type === 'function_call_expression') {
        return adaptCall(node);
    }
    if (node.type === 'member_call_expression') {
        return adaptMemberCallAsCall(node);
    }
    return { kind: 'function_call_expression', name: node.text, arguments: [], loc: locOf(node) };
}

function resolveCallInfo(node: SyntaxNode | null): {
    name: string;
    arguments?: AstNode[];
    chain?: CallNode;
} {
    if (!node) {
        return { name: '' };
    }

    if (node.type === 'name' || node.type === 'qualified_name') {
        return { name: node.text };
    }

    if (node.type === 'member_call_expression') {
        const objNode = node.childForFieldName('object');
        const nameNode = node.childForFieldName('name');
        const argsNode = node.childForFieldName('arguments');
        const methodName = nameNode ? nameNode.text : '';
        const args = argsNode ? adaptArguments(argsNode) : [];
        const chain = objNode ? toCallNode(objNode) : undefined;

        return { name: methodName, arguments: args, chain };
    }

    if (node.type === 'function_call_expression') {
        const inner = adaptCall(node);
        return { name: '', chain: inner };
    }

    return { name: node.text };
}

function adaptMemberCallAsCall(node: SyntaxNode): CallNode {
    const objNode = node.childForFieldName('object');
    const nameNode = node.childForFieldName('name');
    const argsNode = node.childForFieldName('arguments');
    const methodName = nameNode ? nameNode.text : '';
    const args = argsNode ? adaptArguments(argsNode) : [];

    const { name: innerName, arguments: innerArgs, chain } = resolveCallInfo(objNode);

    if (innerName) {
        return {
            kind: 'function_call_expression',
            name: methodName,
            arguments: args,
            chain: {
                kind: 'function_call_expression',
                name: innerName,
                arguments: innerArgs ?? [],
                chain,
                loc: locOf(objNode ?? node),
            },
            loc: locOf(node),
        };
    }

    return {
        kind: 'function_call_expression',
        name: methodName,
        arguments: args,
        chain,
        loc: locOf(node),
    };
}

function adaptArguments(argsNode: SyntaxNode): AstNode[] {
    const args: AstNode[] = [];

    for (const child of argsNode.namedChildren) {
        if (!child) continue;
        if (child.type === 'argument') {
            const nameNode = child.childForFieldName('name');
            const valueNode = child.namedChildren.find(
                (c) => c && c !== nameNode && c.type !== 'name',
            );

            if (nameNode && nameNode.type === 'name' && valueNode) {
                args.push({
                    kind: 'argument',
                    name: nameNode.text,
                    value: adaptExpression(valueNode),
                    loc: locOf(child),
                });
            } else {
                const expr = child.namedChildren[0];
                if (expr) {
                    args.push(adaptExpression(expr));
                }
            }
        } else {
            args.push(adaptExpression(child));
        }
    }

    return args;
}

const SIMPLE_ESCAPES: Record<string, string> = {
    n: '\n',
    t: '\t',
    r: '\r',
    v: '\v',
    e: '\x1b',
    f: '\f',
    '\\': '\\',
    $: '$',
    '"': '"',
};

const decodeDoubleQuoted = (text: string) =>
    text.replace(
        /\\(u\{[0-9A-Fa-f]+\}|x[0-9A-Fa-f]{1,2}|[0-7]{1,3}|[ntrvef\\$"])/g,
        (_match, sequence: string) => {
            if (sequence.startsWith('u{')) {
                return String.fromCodePoint(Number.parseInt(sequence.slice(2, -1), 16));
            }
            if (sequence.startsWith('x')) {
                return String.fromCharCode(Number.parseInt(sequence.slice(1), 16));
            }
            if (/^[0-7]/.test(sequence)) {
                return String.fromCharCode(Number.parseInt(sequence, 8) & 0xff);
            }
            return SIMPLE_ESCAPES[sequence];
        },
    );

function adaptString(node: SyntaxNode): AstNode {
    const text = node.text;
    let value = text;
    if (text.startsWith("'") && text.endsWith("'")) {
        value = text.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    } else if (text.startsWith('"') && text.endsWith('"')) {
        value = decodeDoubleQuoted(text.slice(1, -1));
    }
    return { kind: 'string', value, loc: locOf(node) };
}

const LITERAL_STRING_PARTS = new Set(['string_content', 'escape_sequence']);

function adaptEncapsedString(node: SyntaxNode): AstNode {
    if (node.namedChildren.every((child) => !child || LITERAL_STRING_PARTS.has(child.type))) {
        return adaptString(node);
    }

    const parts: AstNode[] = [];
    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type === 'string_content') {
            parts.push({
                kind: 'string',
                value: child.text,
                loc: locOf(child),
            });
        } else if (child.type === 'variable_name') {
            parts.push({
                kind: 'variable',
                name: child.text.replace(/^\$/, ''),
                loc: locOf(child),
            });
        }
    }
    return { kind: 'encapsed_string', parts, loc: locOf(node) };
}

const expressionAdapters: Record<string, (node: SyntaxNode) => AstNode> = {
    name: (node) =>
        MAGIC_CONSTANTS.has(node.text)
            ? { kind: 'magic_constant', name: node.text, loc: locOf(node) }
            : unsupportedExpression(node),
    string: adaptString,
    encapsed_string: adaptEncapsedString,
    integer: (node) => ({
        kind: 'number',
        value: Number(node.text),
        loc: locOf(node),
    }),
    float: (node) => ({
        kind: 'float',
        value: Number(node.text),
        loc: locOf(node),
    }),
    boolean: (node) => ({
        kind: 'boolean',
        value: node.text.toLowerCase() === 'true',
        loc: locOf(node),
    }),
    null: (node) => ({ kind: 'null', loc: locOf(node) }),
    variable_name: (node) => ({
        kind: 'variable',
        name: node.text.replace(/^\$/, ''),
        loc: locOf(node),
    }),
    class_constant_access_expression: (node) => ({
        kind: 'class_constant_access',
        scope: node.namedChildren[0]?.text ?? '',
        name: node.namedChildren[1]?.text ?? '',
        loc: locOf(node),
    }),
    subscript_expression: (node) => {
        const object = node.namedChildren[0];
        const index = node.namedChildren[1];
        return {
            kind: 'subscript_access_expression',
            object: object ? adaptExpression(object) : EMPTY_STRING_NODE,
            index: index ? adaptExpression(index) : EMPTY_STRING_NODE,
            loc: locOf(node),
        };
    },
    anonymous_function_creation_expression: adaptClosure,
    anonymous_function: adaptClosure,
    arrow_function: adaptArrowFunction,
    function_call_expression: adaptCall,
    member_call_expression: adaptMemberCallAsCall,
    array_creation_expression: adaptArray,
    binary_expression: adaptBinaryExpression,
    unary_op_expression: adaptUnaryExpression,
    conditional_expression: adaptConditionalExpression,
    parenthesized_expression: adaptParenthesizedExpression,
    assignment_expression: adaptAssignment,
};

function adaptBinaryExpression(node: SyntaxNode): AstNode {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    const operator = node.children.find((c) => c && !c.isNamed)?.text ?? '.';
    return {
        kind: 'binary_expression',
        operator,
        left: left ? adaptExpression(left) : EMPTY_STRING_NODE,
        right: right ? adaptExpression(right) : EMPTY_STRING_NODE,
        loc: locOf(node),
    };
}

function adaptUnaryExpression(node: SyntaxNode): AstNode {
    const operand = node.childForFieldName('argument');
    if (!operand) {
        return { kind: 'unsupported_expression', loc: locOf(node) };
    }
    return {
        kind: 'unary_expression',
        operator: node.childForFieldName('operator')?.text ?? '',
        operand: adaptExpression(operand),
        loc: locOf(node),
    };
}

function adaptConditionalExpression(node: SyntaxNode): AstNode {
    const condition = node.childForFieldName('condition');
    const body = node.childForFieldName('body');
    const alternative = node.childForFieldName('alternative');
    return {
        kind: 'conditional_expression',
        condition: condition ? adaptExpression(condition) : EMPTY_STRING_NODE,
        consequent: body ? adaptExpression(body) : EMPTY_STRING_NODE,
        alternate: alternative ? adaptExpression(alternative) : EMPTY_STRING_NODE,
        loc: locOf(node),
    };
}

function adaptParenthesizedExpression(node: SyntaxNode): AstNode {
    const inner = node.namedChildren[0];
    return inner ? adaptExpression(inner) : EMPTY_STRING_NODE;
}

function adaptExpression(node: SyntaxNode): AstNode {
    const adapter = expressionAdapters[node.type];
    if (adapter) {
        return adapter(node);
    }
    return { kind: 'unsupported_expression', loc: locOf(node) };
}

function adaptArray(node: SyntaxNode): AstNode {
    const entries: ArrayEntryNode[] = [];

    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type !== 'array_element_initializer') {
            continue;
        }

        const namedChildren = child.namedChildren.filter((c): c is NonNullable<typeof c> => !!c);
        if (namedChildren.length >= 2) {
            entries.push({
                kind: 'array_element_initializer',
                key: adaptExpression(namedChildren[0]),
                value: adaptExpression(namedChildren[1]),
                loc: locOf(child),
            });
        } else if (namedChildren.length === 1) {
            entries.push({
                kind: 'array_element_initializer',
                value: adaptExpression(namedChildren[0]),
                loc: locOf(child),
            });
        }
    }

    return {
        kind: 'array_creation_expression',
        entries,
        loc: locOf(node),
    };
}

function adaptClosure(node: SyntaxNode): AstNode {
    const bodyNode = node.childForFieldName('body');
    return {
        kind: 'anonymous_function',
        body: bodyNode
            ? adaptBlock(bodyNode)
            : { kind: 'compound_statement', children: [], loc: locOf(node) },
        loc: locOf(node),
    };
}

function adaptArrowFunction(node: SyntaxNode): AstNode {
    const bodyNode = node.childForFieldName('body');

    if (bodyNode) {
        return {
            kind: 'arrow_function',
            body: adaptExpression(bodyNode),
            loc: locOf(node),
        };
    }

    return {
        kind: 'arrow_function',
        body: { kind: 'compound_statement', children: [], loc: locOf(node) },
        loc: locOf(node),
    };
}

function adaptBlock(node: SyntaxNode): AstNode {
    const children: AstNode[] = [];

    for (const child of node.namedChildren) {
        if (!child) continue;
        const adapted = adaptBodyStatement(child) ?? adaptTopLevelNode(child);
        if (adapted) {
            children.push(adapted);
        }
    }

    return {
        kind: 'compound_statement',
        children,
        loc: locOf(node),
    };
}

const INCLUDE_EXPRESSIONS = new Set([
    'include_expression',
    'include_once_expression',
    'require_expression',
    'require_once_expression',
]);
const MAGIC_CONSTANTS = new Set(['__DIR__', '__FILE__']);

function unsupportedExpression(node: SyntaxNode): AstNode {
    return { kind: 'unsupported_expression', loc: locOf(node) };
}

function adaptExpressionStatement(node: SyntaxNode): AstNode | null {
    const exprNode = node.namedChildren[0];
    if (!exprNode) {
        return null;
    }

    if (INCLUDE_EXPRESSIONS.has(exprNode.type)) {
        const pathNode = exprNode.namedChildren[0];
        return {
            kind: 'expression_statement',
            expression: {
                kind: 'include_expression',
                path: pathNode ? adaptExpression(pathNode) : unsupportedExpression(exprNode),
                loc: locOf(exprNode),
            },
            loc: locOf(node),
        };
    }

    return {
        kind: 'expression_statement',
        expression: adaptExpression(exprNode),
        loc: locOf(node),
    };
}

function adaptTopLevelNode(node: SyntaxNode): AstNode | null {
    switch (node.type) {
        case 'namespace_definition':
            return adaptNamespace(node);
        case 'class_declaration':
        case 'trait_declaration':
            return adaptClass(node);
        case 'method_declaration':
            return adaptMethod(node);
        case 'namespace_use_declaration':
        case 'use_declaration':
            return adaptNamespaceUse(node);
        case 'expression_statement':
            return adaptExpressionStatement(node);
        case 'function_call_expression':
            return adaptCall(node);
        default:
            return null;
    }
}

function adaptNamespace(node: SyntaxNode): NamespaceNode {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nameNode.text : '';
    const bodyNode = node.childForFieldName('body');

    const children: AstNode[] = [];

    if (bodyNode) {
        for (const child of bodyNode.namedChildren) {
            if (!child) continue;
            const adapted = adaptTopLevelNode(child);
            if (adapted) {
                children.push(adapted);
            }
        }
    }

    return {
        kind: 'namespace_definition',
        name,
        children,
        loc: locOf(node),
    };
}

export function adapt(rootNode: SyntaxNode): AstNode {
    const children: AstNode[] = [];
    let current = children;

    for (const child of rootNode.namedChildren) {
        if (!child) continue;
        if (child.type === 'namespace_definition') {
            const namespace = adaptNamespace(child);
            children.push(namespace);
            current = child.childForFieldName('body') ? children : namespace.children;
            continue;
        }
        const adapted = adaptTopLevelNode(child);
        if (adapted) {
            current.push(adapted);
        }
    }

    return {
        kind: 'program',
        children,
        loc: locOf(rootNode),
    };
}
