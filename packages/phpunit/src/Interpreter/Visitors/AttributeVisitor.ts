import type { AstNode, AstNodeAttrGroup, ClassNode, MethodNode } from '../AstParser/AstNode';
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

function collectAttributes(node: { attrGroups?: AstNodeAttrGroup[] }): AttributeInfo[] {
    return (node.attrGroups ?? []).flatMap((group) =>
        group.attrs.map((attr) => ({
            name: attr.name.split('\\').pop() ?? attr.name,
            args: attr.args.map(argumentValue),
        })),
    );
}

function argumentValue(arg: AstNode): unknown {
    const node = arg.kind === 'argument' ? arg.value : arg;
    if (node.kind === 'string') {
        return node.value;
    }
    if (node.kind === 'class_constant_access') {
        return `${node.scope}::${node.name}`;
    }
    if (node.kind === 'number') {
        return String(node.value);
    }
    return undefined;
}
