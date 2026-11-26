import type { AstNode, ClassNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Visitor } from '../types';
import { type NamespaceScope, NamespaceVisitor } from './NamespaceVisitor';

export class ClassVisitor implements Visitor {
    readonly nodeKinds = ['class_declaration', 'trait_declaration'];

    private _nodes: ClassNode[] = [];
    private _scopes = new Map<ClassNode, NamespaceScope | undefined>();

    get nodes(): ClassNode[] {
        return this._nodes;
    }

    reset(): void {
        this._nodes = [];
        this._scopes.clear();
    }

    scopeOf(node: ClassNode): NamespaceScope | undefined {
        return this._scopes.get(node);
    }

    visit(node: AstNode, php: PHP): void {
        this._nodes.push(node as ClassNode);
        this._scopes.set(node as ClassNode, php.getVisitor(NamespaceVisitor).current);
    }
}
