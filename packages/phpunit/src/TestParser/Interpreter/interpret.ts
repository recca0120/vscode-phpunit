import type { AstNode, NamespaceNode } from '../AstParser/AstNode';
import { getAstChildren } from '../AstParser/AstNode';
import { collectClassDescriptors } from './ClassInterpreter';
import { FQNResolver } from './FQNResolver';
import { collectPestCalls } from './PestInterpreter';
import { toRange } from './toRange';
import type { FileInfo } from './types';

export function interpret(ast: AstNode): FileInfo {
    const children = getAstChildren(ast);
    const namespaceNode = children.find(
        (c): c is NamespaceNode => c.kind === 'namespace_definition',
    );

    const namespace = namespaceNode?.name;
    const namespaceRange = namespaceNode ? toRange(namespaceNode.loc) : undefined;
    const programRange = toRange(ast.loc);
    const resolverAst = namespaceNode ?? ast;
    const resolver = new FQNResolver(resolverAst, namespace);

    const classes = collectClassDescriptors(ast, namespaceNode, resolver);
    const pestCalls = collectPestCalls(ast, namespaceNode);

    return { namespace, namespaceRange, programRange, classes, pestCalls };
}
