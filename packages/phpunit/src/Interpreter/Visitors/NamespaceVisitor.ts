import type { AstNode, NamespaceNode, UseGroupNode } from '../AstParser/AstNode';
import { getAstChildren } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Range, Visitor } from '../types';

export class NamespaceVisitor implements Visitor {
    readonly nodeKinds = ['namespace_use_declaration'];

    private _namespace?: string;
    private _namespaceRange?: Range;
    private _useMap = new Map<string, string>();

    get namespace(): string | undefined {
        return this._namespace;
    }

    get namespaceRange(): Range | undefined {
        return this._namespaceRange;
    }

    get useMap(): ReadonlyMap<string, string> {
        return this._useMap;
    }

    reset(): void {
        this._namespace = undefined;
        this._namespaceRange = undefined;
        this._useMap.clear();
    }

    resolveSource(ast: AstNode): AstNode[] {
        const children = getAstChildren(ast);
        const namespaceNode = children.find(
            (c): c is NamespaceNode => c.kind === 'namespace_definition',
        );

        this._namespace = namespaceNode?.name;
        this._namespaceRange = namespaceNode?.loc;

        return namespaceNode ? namespaceNode.children : children;
    }

    visit(node: AstNode, _php: PHP): void {
        for (const item of (node as UseGroupNode).items) {
            const fqn = item.name;
            const parts = fqn.split('\\');
            const alias = parts[parts.length - 1];
            this._useMap.set(alias, fqn);
        }
    }
}
