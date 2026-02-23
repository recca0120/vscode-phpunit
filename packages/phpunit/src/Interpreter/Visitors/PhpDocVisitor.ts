import type { AstNode, ClassNode, MethodNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Visitor } from '../types';

export class PhpDocVisitor implements Visitor {
    readonly nodeKinds = ['class_declaration', 'trait_declaration'];

    private comments = new Map<AstNode, string[]>();

    reset(): void {
        this.comments.clear();
    }

    visit(node: AstNode, _php: PHP): void {
        const classNode = node as ClassNode;
        this.comments.set(node, extractComments(classNode));
        for (const child of classNode.body) {
            if (child.kind === 'method_declaration') {
                this.comments.set(child, extractComments(child as MethodNode));
            }
        }
    }

    getComments(node: AstNode): string[] {
        return this.comments.get(node) ?? [];
    }
}

function extractComments(node: { leadingComments?: { value: string }[] }): string[] {
    return (node.leadingComments ?? []).map((c) => c.value);
}
