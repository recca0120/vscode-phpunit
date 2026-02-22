import type { Node as SyntaxNode } from '@vscode/tree-sitter-wasm';
import type {
    ArrayEntryNode,
    AstNode,
    AstNodeAttrGroup,
    AstNodeComment,
    AstNodeLoc,
    CallNode,
    TraitAdaptationNode,
    UseItemNode,
} from '../AstNode';

function locOf(node: SyntaxNode): AstNodeLoc {
    return { start: node.startPosition, end: node.endPosition };
}

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
        if (!child) continue;
        if (child.type !== 'attribute_list') {
            continue;
        }

        for (const group of child.children) {
            if (!group) continue;
            if (group.type !== 'attribute_group') {
                continue;
            }

            const attrs: { name: string; args: { value?: unknown }[] }[] = [];
            for (const attr of group.namedChildren) {
                if (!attr) continue;
                if (attr.type !== 'attribute') {
                    continue;
                }

                const nameNode = attr.childForFieldName('name') ?? attr.namedChildren[0];
                const name = nameNode ? nameNode.text : '';
                const parts = name.split('\\');
                const shortName = name.includes('\\') ? parts[parts.length - 1] : name;

                const args: { value?: unknown }[] = [];
                const argList =
                    attr.childForFieldName('parameters') ??
                    attr.children.find((c) => c?.type === 'arguments');
                if (argList) {
                    for (const arg of argList.namedChildren) {
                        if (!arg) continue;
                        if (arg.type === 'argument') {
                            const valNode =
                                arg.childForFieldName('value') ?? arg.namedChildren[0] ?? null;
                            args.push({ value: extractStringValue(valNode) });
                        } else {
                            args.push({ value: extractStringValue(arg) });
                        }
                    }
                }

                attrs.push({ name: shortName, args });
            }

            if (attrs.length > 0) {
                attrGroups.push({ attrs });
            }
        }
    }

    return attrGroups;
}

function extractStringValue(node: SyntaxNode | null): string | undefined {
    if (!node) {
        return undefined;
    }

    if (node.type === 'string' || node.type === 'encapsed_string') {
        const text = node.text;
        if (
            (text.startsWith("'") && text.endsWith("'")) ||
            (text.startsWith('"') && text.endsWith('"'))
        ) {
            return text.slice(1, -1);
        }
        return text;
    }

    return node.text;
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
            return { start: child.startPosition, end: node.endPosition };
        }
    }
    return locOf(node);
}

function adaptNamespaceUse(node: SyntaxNode): AstNode {
    const items: UseItemNode[] = [];

    for (const child of node.namedChildren) {
        if (!child) continue;
        if (child.type === 'namespace_use_clause') {
            const nameNode = child.namedChildren[0];
            if (nameNode) {
                items.push({
                    kind: 'namespace_use_clause',
                    name: nameNode.text,
                    loc: locOf(child),
                });
            }
        }
    }

    return {
        kind: 'namespace_use_declaration',
        items,
        loc: locOf(node),
    };
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

function adaptMethodBody(bodyNode: SyntaxNode): AstNode[] {
    const statements: AstNode[] = [];

    for (const child of bodyNode.namedChildren) {
        if (!child) continue;
        if (child.type === 'return_statement') {
            const valNode = child.namedChildren[0];
            statements.push({
                kind: 'return_statement',
                value: valNode ? adaptExpression(valNode) : undefined,
                loc: locOf(child),
            });
        } else if (child.type === 'expression_statement') {
            const expr = child.namedChildren[0];
            if (expr?.type === 'yield_expression') {
                statements.push(adaptYield(expr));
            }
        }
    }

    return statements;
}

function adaptYield(node: SyntaxNode): AstNode {
    const children = node.namedChildren.filter((c): c is NonNullable<typeof c> => !!c);

    // yield 'key' => value — tree-sitter wraps as array_element_initializer
    if (children.length === 1 && children[0].type === 'array_element_initializer') {
        const entry = children[0];
        const keyNode = entry.namedChildren[0];
        const valueNode = entry.namedChildren[1];
        return {
            kind: 'yield_expression',
            key: keyNode ? adaptExpression(keyNode) : undefined,
            value: valueNode ? adaptExpression(valueNode) : undefined,
            loc: locOf(node),
        };
    }

    // yield value (no key)
    return {
        kind: 'yield_expression',
        value: children.length > 0 ? adaptExpression(children[0]) : undefined,
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
                loc: objNode ? locOf(objNode) : undefined,
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

function adaptExpression(node: SyntaxNode): AstNode {
    if (node.type === 'string' || node.type === 'encapsed_string') {
        const text = node.text;
        let value = text;
        if (text.startsWith("'") && text.endsWith("'")) {
            value = text.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        } else if (text.startsWith('"') && text.endsWith('"')) {
            value = text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        return { kind: 'string', value, loc: locOf(node) };
    }

    if (
        node.type === 'anonymous_function_creation_expression' ||
        node.type === 'anonymous_function'
    ) {
        return adaptClosure(node);
    }

    if (node.type === 'arrow_function') {
        return adaptArrowFunction(node);
    }

    if (node.type === 'function_call_expression') {
        return adaptCall(node);
    }

    if (node.type === 'member_call_expression') {
        return adaptMemberCallAsCall(node);
    }

    if (node.type === 'array_creation_expression') {
        return adaptArray(node);
    }

    return { kind: 'string', value: node.text, loc: locOf(node) };
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
        if (child.type === 'expression_statement') {
            const expr = child.namedChildren[0];
            if (expr?.type === 'yield_expression') {
                children.push(adaptYield(expr));
                continue;
            }
        }
        const adapted = adaptTopLevelNode(child);
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

function adaptExpressionStatement(node: SyntaxNode): AstNode | null {
    const exprNode = node.namedChildren[0];
    if (!exprNode) {
        return null;
    }

    if (exprNode.type === 'include_expression' || exprNode.type === 'include_once_expression') {
        return {
            kind: 'expression_statement',
            expression: { kind: 'include_expression' },
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
            return adaptNamespaceUse(node);
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

function adaptNamespace(node: SyntaxNode): AstNode {
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
    const programChildren = rootNode.namedChildren;
    const children: AstNode[] = [];

    const nsIndex = programChildren.findIndex((c) => c?.type === 'namespace_definition');

    const nsNode = nsIndex >= 0 ? programChildren[nsIndex] : undefined;
    if (nsNode) {
        const hasBraces = nsNode.childForFieldName('body') !== null;

        if (hasBraces) {
            children.push(adaptNamespace(nsNode));
        } else {
            const nsChildren: AstNode[] = [];

            for (let i = nsIndex + 1; i < programChildren.length; i++) {
                const child = programChildren[i];
                if (!child) continue;
                const adapted = adaptTopLevelNode(child);
                if (adapted) {
                    nsChildren.push(adapted);
                }
            }

            const nameNode = nsNode.childForFieldName('name');
            const name = nameNode ? nameNode.text : '';

            children.push({
                kind: 'namespace_definition',
                name,
                children: nsChildren,
                loc: locOf(nsNode),
            });
        }
    } else {
        for (const child of programChildren) {
            if (!child) continue;
            if (child.type === 'php_tag' || child.type === 'text') {
                continue;
            }
            const adapted = adaptTopLevelNode(child);
            if (adapted) {
                children.push(adapted);
            }
        }
    }

    return {
        kind: 'program',
        children,
        loc: locOf(rootNode),
    };
}
