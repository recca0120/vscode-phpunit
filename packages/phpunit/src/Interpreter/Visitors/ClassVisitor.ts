import type { AstNode, ClassNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Visitor } from '../types';

export class ClassVisitor implements Visitor {
    readonly nodeKinds = ['class_declaration', 'trait_declaration'];

    private _nodes: ClassNode[] = [];

    get nodes(): ClassNode[] {
        return this._nodes;
    }

    reset(): void {
        this._nodes = [];
    }

    visit(node: AstNode, _php: PHP): void {
        this._nodes.push(node as ClassNode);
    }
}
