import type { AstNode, NamespaceNode, UseGroupNode } from '../AstParser/AstNode';
import { getAstChildren } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Range, Visitor } from '../types';

export interface NamespaceScope {
    readonly name?: string;
    readonly range?: Range;
    readonly useMap: Map<string, string>;
}

export interface NamespaceSection {
    scope: NamespaceScope;
    children: AstNode[];
}

export class NamespaceVisitor implements Visitor {
    readonly nodeKinds = ['namespace_use_declaration'];

    private _scopes: NamespaceScope[] = [];
    private _current?: NamespaceScope;

    get scopes(): readonly NamespaceScope[] {
        return this._scopes;
    }

    get current(): NamespaceScope | undefined {
        return this._current;
    }

    reset(): void {
        this._scopes = [];
        this._current = undefined;
    }

    resolveSections(ast: AstNode): NamespaceSection[] {
        const children = getAstChildren(ast);
        const namespaceNodes = children.filter(
            (c): c is NamespaceNode => c.kind === 'namespace_definition',
        );
        const sections =
            namespaceNodes.length > 0
                ? namespaceNodes.map((node) => ({
                      scope: { name: node.name, range: node.loc, useMap: new Map() },
                      children: node.children,
                  }))
                : [{ scope: { useMap: new Map() }, children }];

        this._scopes = sections.map((section) => section.scope);
        return sections;
    }

    enter(scope: NamespaceScope): void {
        this._current = scope;
    }

    visit(node: AstNode, _php: PHP): void {
        for (const item of (node as UseGroupNode).items) {
            this._current?.useMap.set(
                item.alias ?? item.name.split('\\').pop() ?? item.name,
                item.name,
            );
        }
    }
}
