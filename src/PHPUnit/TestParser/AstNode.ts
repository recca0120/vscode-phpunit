export interface AstNodePosition {
    /** Zero-based row number (matches tree-sitter Point) */
    row: number;
    /** Zero-based column number (matches tree-sitter Point) */
    column: number;
}
export interface AstNodeLoc {
    start: AstNodePosition;
    end: AstNodePosition;
}
export interface AstNodeComment {
    kind: string;
    value: string;
    loc?: AstNodeLoc;
}
export interface AstNodeAttrGroup {
    attrs: AstNodeAttribute[];
}
export interface AstNodeAttribute {
    name: string;
    args: { value?: unknown }[];
}

export interface ProgramNode {
    kind: 'program';
    children: AstNode[];
    loc?: AstNodeLoc;
}

export interface NamespaceNode {
    kind: 'namespace_definition';
    name: string;
    children: AstNode[];
    loc?: AstNodeLoc;
}

export interface ClassNode {
    kind: 'class_declaration' | 'trait_declaration';
    name: string;
    isAbstract: boolean;
    extendsName?: string;
    body: AstNode[];
    leadingComments?: AstNodeComment[];
    attrGroups?: AstNodeAttrGroup[];
    loc?: AstNodeLoc;
}

export interface MethodNode {
    kind: 'method_declaration';
    name: string;
    visibility: string;
    isAbstract: boolean;
    leadingComments?: AstNodeComment[];
    attrGroups?: AstNodeAttrGroup[];
    loc?: AstNodeLoc;
}

export interface TraitUseNode {
    kind: 'use_declaration';
    traits: string[];
    adaptations: TraitAdaptationNode[];
    loc?: AstNodeLoc;
}

export type TraitAdaptationNode = TraitPrecedenceNode | TraitAliasNode;

export interface TraitPrecedenceNode {
    kind: 'use_instead_of_clause';
    trait?: string;
    method: string;
    instead: string[];
    loc?: AstNodeLoc;
}

export interface TraitAliasNode {
    kind: 'use_as_clause';
    trait?: string;
    method: string;
    alias?: string;
    visibility?: string;
    loc?: AstNodeLoc;
}

export interface UseGroupNode {
    kind: 'namespace_use_declaration';
    items: UseItemNode[];
    loc?: AstNodeLoc;
}

export interface UseItemNode {
    kind: 'namespace_use_clause';
    name: string;
    loc?: AstNodeLoc;
}

export interface CallNode {
    kind: 'function_call_expression';
    name: string;
    arguments: AstNode[];
    chain?: CallNode;
    loc?: AstNodeLoc;
}

export interface ExpressionStatementNode {
    kind: 'expression_statement';
    expression: AstNode;
    loc?: AstNodeLoc;
}

export interface StringNode {
    kind: 'string';
    value: string;
    loc?: AstNodeLoc;
}

export interface ArgumentNode {
    kind: 'argument';
    name: string;
    value: AstNode;
    loc?: AstNodeLoc;
}

export interface ClosureNode {
    kind: 'anonymous_function';
    body: AstNode;
    loc?: AstNodeLoc;
}

export interface ArrowFuncNode {
    kind: 'arrow_function';
    body: AstNode;
    loc?: AstNodeLoc;
}

export interface BlockNode {
    kind: 'compound_statement';
    children: AstNode[];
    loc?: AstNodeLoc;
}

export interface IncludeNode {
    kind: 'include_expression';
    loc?: AstNodeLoc;
}

export function getAstChildren(ast: AstNode): AstNode[] {
    if (
        ast.kind === 'program' ||
        ast.kind === 'namespace_definition' ||
        ast.kind === 'compound_statement'
    ) {
        return ast.children;
    }
    return [];
}

export type AstNode =
    | ProgramNode
    | NamespaceNode
    | ClassNode
    | MethodNode
    | TraitUseNode
    | TraitPrecedenceNode
    | TraitAliasNode
    | UseGroupNode
    | UseItemNode
    | CallNode
    | ExpressionStatementNode
    | StringNode
    | ArgumentNode
    | ClosureNode
    | ArrowFuncNode
    | BlockNode
    | IncludeNode;
