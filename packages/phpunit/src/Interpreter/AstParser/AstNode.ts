import type { Position, Range } from '../../types';

export type AstNodeLoc = Range;
export type AstNodePosition = Position;
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
    loc: AstNodeLoc;
}

export interface MethodNode {
    kind: 'method_declaration';
    name: string;
    visibility: string;
    isAbstract: boolean;
    body?: AstNode[];
    leadingComments?: AstNodeComment[];
    attrGroups?: AstNodeAttrGroup[];
    loc: AstNodeLoc;
}

export interface ReturnStatementNode {
    kind: 'return_statement';
    value?: AstNode;
    loc?: AstNodeLoc;
}

export interface YieldExpressionNode {
    kind: 'yield_expression';
    key?: AstNode;
    value?: AstNode;
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
    loc: AstNodeLoc;
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

export interface ForStatementNode {
    kind: 'for_statement';
    init?: { variable: string; value: AstNode };
    condition?: { variable: string; operator: string; value: AstNode };
    update?: { variable: string; operator: string };
    body: AstNode[];
    loc?: AstNodeLoc;
}

export interface ForeachStatementNode {
    kind: 'foreach_statement';
    source: AstNode;
    valueVariable: string;
    keyVariable?: string;
    body: AstNode[];
    loc?: AstNodeLoc;
}

export interface WhileStatementNode {
    kind: 'while_statement';
    condition: { variable: string; operator: string; value: AstNode };
    body: AstNode[];
    loc?: AstNodeLoc;
}

export interface IfStatementNode {
    kind: 'if_statement';
    condition: AstNode;
    body: AstNode[];
    elseBody?: AstNode[];
    loc?: AstNodeLoc;
}

export interface BreakStatementNode {
    kind: 'break_statement';
    loc?: AstNodeLoc;
}

export interface ContinueStatementNode {
    kind: 'continue_statement';
    loc?: AstNodeLoc;
}

export interface BinaryOpNode {
    kind: 'binary_expression';
    operator: string;
    left: AstNode;
    right: AstNode;
    loc?: AstNodeLoc;
}

export interface ConditionalExpressionNode {
    kind: 'conditional_expression';
    condition: AstNode;
    consequent: AstNode;
    alternate: AstNode;
    loc?: AstNodeLoc;
}

export interface AssignmentNode {
    kind: 'assignment_expression';
    operator?: string;
    variable: string;
    value: AstNode;
    loc?: AstNodeLoc;
}

export interface UpdateExpressionNode {
    kind: 'update_expression';
    variable: string;
    operator: string;
    loc?: AstNodeLoc;
}

export interface EncapsedStringNode {
    kind: 'encapsed_string';
    parts: AstNode[];
    loc?: AstNodeLoc;
}

export interface VariableNode {
    kind: 'variable';
    name: string;
    loc?: AstNodeLoc;
}

export interface NumberNode {
    kind: 'number';
    value: number;
    loc?: AstNodeLoc;
}

export interface ClassConstantAccessNode {
    kind: 'class_constant_access';
    scope: string;
    name: string;
    loc?: AstNodeLoc;
}

export interface ConstDeclarationNode {
    kind: 'const_declaration';
    name: string;
    value?: AstNode;
    loc?: AstNodeLoc;
}

export interface SubscriptAccessNode {
    kind: 'subscript_access_expression';
    object: AstNode;
    index: AstNode;
    loc?: AstNodeLoc;
}

export interface ArrayCreationNode {
    kind: 'array_creation_expression';
    entries: ArrayEntryNode[];
    loc?: AstNodeLoc;
}

export interface ArrayEntryNode {
    kind: 'array_element_initializer';
    key?: AstNode;
    value: AstNode;
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
    | IncludeNode
    | ArrayCreationNode
    | ArrayEntryNode
    | ReturnStatementNode
    | YieldExpressionNode
    | ForStatementNode
    | ForeachStatementNode
    | WhileStatementNode
    | IfStatementNode
    | BreakStatementNode
    | ContinueStatementNode
    | BinaryOpNode
    | ConditionalExpressionNode
    | AssignmentNode
    | UpdateExpressionNode
    | EncapsedStringNode
    | VariableNode
    | NumberNode
    | ClassConstantAccessNode
    | ConstDeclarationNode
    | SubscriptAccessNode;
