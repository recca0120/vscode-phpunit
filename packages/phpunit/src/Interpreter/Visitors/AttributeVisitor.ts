import type { AstNode, ClassNode, MethodNode } from '../AstParser/AstNode';
import type { PHP } from '../PHP';
import type { Visitor } from '../types';

export interface AttributeInfo {
    name: string;
    args: unknown[];
}

export class AttributeVisitor implements Visitor {
    readonly nodeKinds = ['class_declaration', 'trait_declaration'];

    private attributes = new Map<AstNode, AttributeInfo[]>();

    reset(): void {
        this.attributes.clear();
    }

    visit(node: AstNode, _php: PHP): void {
        const classNode = node as ClassNode;
        this.attributes.set(node, collectAttributes(classNode));
        for (const child of classNode.body) {
            if (child.kind === 'method_declaration') {
                this.attributes.set(child, collectAttributes(child as MethodNode));
            }
        }
    }

    getAttributes(node: AstNode): AttributeInfo[] {
        return this.attributes.get(node) ?? [];
    }
}

function collectAttributes(node: {
    attrGroups?: { attrs: { name: string; args: { value?: unknown }[] }[] }[];
}): AttributeInfo[] {
    if (!node.attrGroups) {
        return [];
    }
    const result: AttributeInfo[] = [];
    for (const group of node.attrGroups) {
        for (const attr of group.attrs) {
            result.push({
                name: attr.name,
                args: attr.args.map((arg) => arg.value),
            });
        }
    }
    return result;
}
