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
        if (!child || child.type !== 'attribute_list') continue;

        for (const group of child.children) {
            if (!group || group.type !== 'attribute_group') continue;

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

function parseAttribute(attr: SyntaxNode): { name: string; args: { value?: unknown }[] } {
    const nameNode = attr.childForFieldName('name') ?? attr.namedChildren[0];
    const name = nameNode ? nameNode.text : '';
    const shortName = name.includes('\\') ? (name.split('\\').pop() ?? name) : name;

    const argList =
        attr.childForFieldName('parameters') ?? attr.children.find((c) => c?.type === 'arguments');

    const args = argList
        ? argList.namedChildren
              .filter((arg): arg is NonNullable<typeof arg> => !!arg)
              .map((arg) => {
                  const valNode =
                      arg.type === 'argument'
                          ? (arg.childForFieldName('value') ?? arg.namedChildren[0] ?? null)
                          : arg;
                  return { value: extractStringValue(valNode) };
              })
        : [];

    return { name: shortName, args };
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
        if (child.type === 'return_statement') {
            const valNode = child.namedChildren[0];
            statements.push({
                kind: 'return_statement',
                value: valNode ? adaptExpression(valNode) : undefined,
                loc: locOf(child),
            });
            continue;
        }
        if (child.type === 'for_statement') {
            statements.push(adaptForStatement(child));
            continue;
        }
        if (child.type === 'foreach_statement') {
            statements.push(adaptForeachStatement(child));
            continue;
        }
        if (child.type === 'while_statement') {
            statements.push(adaptWhileStatement(child));
            continue;
        }
        if (child.type === 'expression_statement') {
            const expr = child.namedChildren[0];
            if (expr?.type === 'assignment_expression') {
                statements.push(adaptAssignment(expr));
                continue;
            }
            if (expr?.type === 'update_expression') {
                statements.push(adaptUpdateExpression(expr));
                continue;
            }
        }
        const yieldNode = tryAdaptYieldFromStatement(child);
        if (yieldNode) {
            statements.push(yieldNode);
        }
    }

    return statements;
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
    let source: AstNode = { kind: 'string', value: '', loc: locOf(node) };
    let valueVariable = '';
    let foundAs = false;

    // foreach (EXPR as $v) { ... }
    for (const child of node.children) {
        if (!child) continue;
        if (!foundAs && isExpressionType(child.type)) {
            source = adaptExpression(child);
        } else if (child.type === 'as') {
            foundAs = true;
        } else if (foundAs && child.type === 'variable_name') {
            valueVariable = child.text.replace(/^\$/, '');
        }
    }

    const bodyNode = node.childForFieldName('body');

    return {
        kind: 'foreach_statement',
        source,
        valueVariable,
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
            value: { kind: 'number', value: 0 } as AstNode,
        },
        body: bodyNode ? adaptMethodBody(bodyNode) : [],
        loc: locOf(node),
    };
}

function adaptAssignment(node: SyntaxNode): AstNode {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    return {
        kind: 'assignment_expression',
        variable: left?.text.replace(/^\$/, '') ?? '',
        value: right ? adaptExpression(right) : ({ kind: 'number', value: 0 } as AstNode),
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

function isExpressionType(type: string): boolean {
    return (
        type === 'array_creation_expression' ||
        type === 'class_constant_access_expression' ||
        type === 'variable_name' ||
        type === 'function_call_expression'
    );
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

function adaptString(node: SyntaxNode): AstNode {
    const text = node.text;
    let value = text;
    if (text.startsWith("'") && text.endsWith("'")) {
        value = text.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    } else if (text.startsWith('"') && text.endsWith('"')) {
        value = text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return { kind: 'string', value, loc: locOf(node) };
}

function adaptEncapsedString(node: SyntaxNode): AstNode {
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
    string: adaptString,
    encapsed_string: adaptEncapsedString,
    integer: (node) => ({
        kind: 'number',
        value: Number(node.text),
        loc: locOf(node),
    }),
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
    anonymous_function_creation_expression: adaptClosure,
    anonymous_function: adaptClosure,
    arrow_function: adaptArrowFunction,
    function_call_expression: adaptCall,
    member_call_expression: adaptMemberCallAsCall,
    array_creation_expression: adaptArray,
    binary_expression: adaptBinaryExpression,
    conditional_expression: adaptConditionalExpression,
    parenthesized_expression: adaptParenthesizedExpression,
};

function adaptBinaryExpression(node: SyntaxNode): AstNode {
    const left = node.childForFieldName('left');
    const right = node.childForFieldName('right');
    const operator = node.children.find((c) => c && !c.isNamed)?.text ?? '.';
    return {
        kind: 'binary_expression',
        operator,
        left: left ? adaptExpression(left) : ({ kind: 'string', value: '' } as AstNode),
        right: right ? adaptExpression(right) : ({ kind: 'string', value: '' } as AstNode),
        loc: locOf(node),
    };
}

function adaptConditionalExpression(node: SyntaxNode): AstNode {
    const condition = node.childForFieldName('condition');
    const body = node.childForFieldName('body');
    const alternative = node.childForFieldName('alternative');
    return {
        kind: 'conditional_expression',
        condition: condition
            ? adaptExpression(condition)
            : ({ kind: 'string', value: '' } as AstNode),
        consequent: body ? adaptExpression(body) : ({ kind: 'string', value: '' } as AstNode),
        alternate: alternative
            ? adaptExpression(alternative)
            : ({ kind: 'string', value: '' } as AstNode),
        loc: locOf(node),
    };
}

function adaptParenthesizedExpression(node: SyntaxNode): AstNode {
    const inner = node.namedChildren[0];
    return inner ? adaptExpression(inner) : ({ kind: 'string', value: '' } as AstNode);
}

function adaptExpression(node: SyntaxNode): AstNode {
    const adapter = expressionAdapters[node.type];
    if (adapter) {
        return adapter(node);
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
        const yieldNode = tryAdaptYieldFromStatement(child);
        if (yieldNode) {
            children.push(yieldNode);
            continue;
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
