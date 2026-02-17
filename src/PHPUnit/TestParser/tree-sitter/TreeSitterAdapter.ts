import type { Node as SyntaxNode } from '@vscode/tree-sitter-wasm';

interface Loc {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
}

function toLoc(node: SyntaxNode): Loc {
    return {
        start: {
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            offset: node.startIndex,
        },
        end: {
            line: node.endPosition.row + 1,
            column: node.endPosition.column,
            offset: node.endIndex,
        },
    };
}

function collectLeadingComments(node: SyntaxNode): any[] {
    const comments: any[] = [];

    // In tree-sitter, comments can be:
    // 1. Children of the node (e.g., method_declaration contains comment children)
    // 2. Previous siblings of the node

    // First check children of the node (for method_declaration, class_declaration)
    for (const child of node.children) {
        if (child.type === 'comment') {
            comments.push({
                kind: child.text.startsWith('/*') ? 'commentblock' : 'commentline',
                value: child.text,
                loc: toLoc(child),
            });
        }
    }

    if (comments.length > 0) {
        return comments;
    }

    // Fallback: check previous siblings
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
            kind: c.text.startsWith('/*') ? 'commentblock' : 'commentline',
            value: c.text,
            loc: toLoc(c),
        });
    }

    return comments;
}

function collectAttrGroups(node: SyntaxNode): any[] {
    const attrGroups: any[] = [];

    for (const child of node.children) {
        if (child.type !== 'attribute_list') {
            continue;
        }

        for (const group of child.children) {
            if (group.type !== 'attribute_group') {
                continue;
            }

            const attrs: any[] = [];
            for (const attr of group.namedChildren) {
                if (attr.type !== 'attribute') {
                    continue;
                }

                const nameNode = attr.childForFieldName('name') ?? attr.namedChildren[0];
                const name = nameNode ? nameNode.text : '';
                const shortName = name.includes('\\') ? name.split('\\').pop()! : name;

                const args: any[] = [];
                const argList =
                    attr.childForFieldName('parameters') ??
                    attr.children.find((c) => c.type === 'arguments');
                if (argList) {
                    for (const arg of argList.namedChildren) {
                        if (arg.type === 'argument') {
                            const valNode = arg.childForFieldName('value') ?? arg.namedChildren[0];
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
        if (child.type === 'visibility_modifier') {
            return child.text;
        }
    }
    return '';
}

function isAbstract(node: SyntaxNode): boolean {
    for (const child of node.children) {
        if (child.type === 'abstract_modifier') {
            return true;
        }
    }
    return false;
}

function adaptNamespaceUse(node: SyntaxNode): any {
    const items: any[] = [];

    for (const child of node.namedChildren) {
        if (child.type === 'namespace_use_clause') {
            const nameNode = child.namedChildren[0];
            if (nameNode) {
                items.push({
                    kind: 'useitem',
                    name: nameNode.text,
                    loc: toLoc(child),
                });
            }
        }
    }

    return {
        kind: 'usegroup',
        items,
        loc: toLoc(node),
    };
}

function adaptTraitUse(node: SyntaxNode): any {
    const traits: any[] = [];
    const adaptations: any[] = [];

    for (const child of node.namedChildren) {
        if (child.type === 'name' || child.type === 'qualified_name') {
            traits.push({ kind: 'name', name: child.text });
        } else if (child.type === 'use_list') {
            for (const item of child.namedChildren) {
                if (item.type === 'use_instead_of_clause') {
                    adaptations.push(adaptInsteadOf(item));
                } else if (item.type === 'use_as_clause') {
                    adaptations.push(adaptAsAlias(item));
                }
            }
        }
    }

    return {
        kind: 'traituse',
        traits,
        adaptations: adaptations.length > 0 ? adaptations : null,
        loc: toLoc(node),
    };
}

function adaptInsteadOf(node: SyntaxNode): any {
    let trait: any = null;
    let method: any = null;
    const instead: any[] = [];

    for (const child of node.namedChildren) {
        if (child.type === 'class_constant_access_expression') {
            const parts = child.namedChildren;
            trait = parts[0] ? { kind: 'name', name: parts[0].text } : null;
            method = parts[1] ? parts[1].text : null;
        } else if (child.type === 'name' || child.type === 'qualified_name') {
            instead.push({ kind: 'name', name: child.text });
        }
    }

    return {
        kind: 'traitprecedence',
        trait,
        method,
        instead,
    };
}

function adaptAsAlias(node: SyntaxNode): any {
    let trait: any = null;
    let method: any = null;
    let alias: any = null;
    let visibility: string | null = null;

    for (const child of node.namedChildren) {
        if (child.type === 'class_constant_access_expression') {
            const parts = child.namedChildren;
            trait = parts[0] ? { kind: 'name', name: parts[0].text } : null;
            method = parts[1] ? parts[1].text : null;
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
        kind: 'traitalias',
        trait,
        method,
        as: alias,
        visibility,
    };
}

function getDeclarationLoc(node: SyntaxNode): Loc {
    // php-parser reports position starting from the keyword (class/public/function),
    // not from attributes or comments. Find the first non-attribute, non-comment child.
    for (const child of node.children) {
        if (child.type !== 'attribute_list' && child.type !== 'comment') {
            return {
                start: {
                    line: child.startPosition.row + 1,
                    column: child.startPosition.column,
                    offset: child.startIndex,
                },
                end: toLoc(node).end,
            };
        }
    }
    return toLoc(node);
}

function adaptMethod(node: SyntaxNode): any {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nameNode.text : '';
    const leadingComments = collectLeadingComments(node);
    const attrGroups = collectAttrGroups(node);

    return {
        kind: 'method',
        name: { kind: 'identifier', name },
        visibility: adaptVisibility(node),
        isAbstract: isAbstract(node),
        leadingComments,
        attrGroups,
        body: [],
        loc: getDeclarationLoc(node),
    };
}

function adaptClass(node: SyntaxNode): any {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nameNode.text : '';
    const baseClause = node.children.find((c) => c.type === 'base_clause');
    let extendsNode: any = null;

    if (baseClause) {
        const extName = baseClause.namedChildren[0];
        if (extName) {
            extendsNode = { kind: 'name', name: extName.text };
        }
    }

    const bodyNode = node.childForFieldName('body');
    const body = bodyNode ? adaptClassBody(bodyNode) : [];
    const leadingComments = collectLeadingComments(node);
    const attrGroups = collectAttrGroups(node);
    const abstract = isAbstract(node);

    return {
        kind: node.type === 'trait_declaration' ? 'trait' : 'class',
        name: { kind: 'identifier', name },
        isAbstract: abstract,
        extends: extendsNode,
        body,
        leadingComments,
        attrGroups,
        loc: getDeclarationLoc(node),
    };
}

function adaptClassBody(bodyNode: SyntaxNode): any[] {
    const result: any[] = [];

    for (const child of bodyNode.namedChildren) {
        if (child.type === 'method_declaration') {
            result.push(adaptMethod(child));
        } else if (child.type === 'use_declaration') {
            result.push(adaptTraitUse(child));
        }
        // Skip property_declaration, property_hook, const_declaration, etc.
    }

    return result;
}

function adaptCallExpression(node: SyntaxNode): any {
    const funcNode = node.childForFieldName('function');
    const argsNode = node.childForFieldName('arguments');

    const what = adaptWhat(funcNode);
    const args = argsNode ? adaptArguments(argsNode) : [];

    return {
        kind: 'call',
        what,
        arguments: args,
        loc: toLoc(node),
    };
}

function adaptWhat(node: SyntaxNode | null): any {
    if (!node) {
        return { kind: 'name', name: '' };
    }

    if (node.type === 'name' || node.type === 'qualified_name') {
        return { kind: 'name', name: node.text };
    }

    if (node.type === 'member_call_expression') {
        const objNode = node.childForFieldName('object');
        const nameNode = node.childForFieldName('name');
        const argsNode = node.childForFieldName('arguments');

        return {
            kind: 'call',
            what: {
                kind: 'propertylookup',
                what: adaptWhat(objNode),
                offset: nameNode ? { kind: 'identifier', name: nameNode.text } : undefined,
            },
            arguments: argsNode ? adaptArguments(argsNode) : [],
            loc: toLoc(node),
        };
    }

    if (node.type === 'function_call_expression') {
        return adaptCallExpression(node);
    }

    return { kind: 'name', name: node.text };
}

function adaptArguments(argsNode: SyntaxNode): any[] {
    const args: any[] = [];

    for (const child of argsNode.namedChildren) {
        if (child.type === 'argument') {
            const nameNode = child.childForFieldName('name');
            const valueNode = child.namedChildren.find((c) => c !== nameNode && c.type !== 'name');

            if (nameNode && nameNode.type === 'name' && valueNode) {
                // Named argument: fn(description: 'something', test: function() {})
                args.push({
                    kind: 'namedargument',
                    name: nameNode.text,
                    value: adaptExpression(valueNode),
                    loc: toLoc(child),
                });
            } else {
                // Positional argument
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

function adaptExpression(node: SyntaxNode): any {
    if (node.type === 'string' || node.type === 'encapsed_string') {
        const text = node.text;
        let value = text;
        if (text.startsWith("'") && text.endsWith("'")) {
            value = text.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
        } else if (text.startsWith('"') && text.endsWith('"')) {
            value = text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        return { kind: 'string', value, loc: toLoc(node) };
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
        return adaptCallExpression(node);
    }

    if (node.type === 'member_call_expression') {
        const objNode = node.childForFieldName('object');
        const nameNode = node.childForFieldName('name');
        const argsNode = node.childForFieldName('arguments');

        return {
            kind: 'call',
            what: {
                kind: 'propertylookup',
                what: adaptWhat(objNode),
                offset: nameNode ? { kind: 'identifier', name: nameNode.text } : undefined,
            },
            arguments: argsNode ? adaptArguments(argsNode) : [],
            loc: toLoc(node),
        };
    }

    return { kind: node.type, value: node.text, loc: toLoc(node) };
}

function adaptClosure(node: SyntaxNode): any {
    const bodyNode = node.childForFieldName('body');
    return {
        kind: 'closure',
        body: bodyNode ? adaptBlock(bodyNode) : { kind: 'block', children: [], loc: toLoc(node) },
        loc: toLoc(node),
    };
}

function adaptArrowFunction(node: SyntaxNode): any {
    const bodyNode = node.childForFieldName('body');

    if (bodyNode) {
        return {
            kind: 'arrowfunc',
            body: adaptExpression(bodyNode),
            loc: toLoc(node),
        };
    }

    return {
        kind: 'arrowfunc',
        body: { kind: 'noop', loc: toLoc(node) },
        loc: toLoc(node),
    };
}

function adaptBlock(node: SyntaxNode): any {
    const children: any[] = [];

    for (const child of node.namedChildren) {
        const adapted = adaptTopLevelNode(child);
        if (adapted) {
            children.push(adapted);
        }
    }

    return {
        kind: 'block',
        children,
        loc: toLoc(node),
    };
}

function adaptExpressionStatement(node: SyntaxNode): any {
    const exprNode = node.namedChildren[0];
    if (!exprNode) {
        return null;
    }

    if (exprNode.type === 'include_expression' || exprNode.type === 'include_once_expression') {
        return {
            kind: 'expressionstatement',
            expression: { kind: 'include' },
            loc: toLoc(node),
        };
    }

    return {
        kind: 'expressionstatement',
        expression: adaptExpression(exprNode),
        loc: toLoc(node),
    };
}

function adaptTopLevelNode(node: SyntaxNode): any {
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
            // At top level this shouldn't happen (trait use is inside class body)
            return adaptNamespaceUse(node);
        case 'expression_statement':
            return adaptExpressionStatement(node);
        case 'function_call_expression':
            return adaptCallExpression(node);
        default:
            return null;
    }
}

function adaptNamespace(node: SyntaxNode): any {
    const nameNode = node.childForFieldName('name');
    const name = nameNode ? nameNode.text : '';
    const bodyNode = node.childForFieldName('body');

    const children: any[] = [];

    if (bodyNode) {
        // Namespace with braces: namespace Foo { ... }
        for (const child of bodyNode.namedChildren) {
            const adapted = adaptTopLevelNode(child);
            if (adapted) {
                children.push(adapted);
            }
        }
    }
    // For non-braced namespace: namespace Foo;
    // Children are siblings at the program level — handled in adapt()

    return {
        kind: 'namespace',
        name,
        children,
        loc: toLoc(node),
    };
}

export function adapt(rootNode: SyntaxNode): any {
    const programChildren = rootNode.namedChildren;
    const children: any[] = [];

    // Find namespace definitions
    let nsIndex = -1;
    for (let i = 0; i < programChildren.length; i++) {
        if (programChildren[i].type === 'namespace_definition') {
            nsIndex = i;
            break;
        }
    }

    if (nsIndex >= 0) {
        const nsNode = programChildren[nsIndex];
        const hasBraces = nsNode.childForFieldName('body') !== null;

        if (hasBraces) {
            // Braced namespace: just adapt the namespace node
            children.push(adaptNamespace(nsNode));
        } else {
            // Non-braced namespace: subsequent siblings become children of the namespace
            const nsChildren: any[] = [];

            for (let i = nsIndex + 1; i < programChildren.length; i++) {
                const child = programChildren[i];
                const adapted = adaptTopLevelNode(child);
                if (adapted) {
                    nsChildren.push(adapted);
                }
            }

            const nameNode = nsNode.childForFieldName('name');
            const name = nameNode ? nameNode.text : '';

            children.push({
                kind: 'namespace',
                name,
                children: nsChildren,
                loc: toLoc(nsNode),
            });
        }
    } else {
        // No namespace: adapt all children
        for (const child of programChildren) {
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
        loc: toLoc(rootNode),
    };
}
