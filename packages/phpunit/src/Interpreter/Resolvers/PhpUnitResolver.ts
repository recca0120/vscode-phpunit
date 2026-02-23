import type { TraitAdaptation } from '../../TestParser/ClassHierarchy';
import type {
    AstNode,
    ClassNode,
    ConstDeclarationNode,
    MethodNode,
    TraitUseNode,
} from '../AstParser/AstNode';
import { resolveLabels } from '../Expressions/PhpExpression';
import type { PHP } from '../PHP';
import type {
    ClassDescriptor,
    ConstantDescriptor,
    FileInfo,
    MethodDescriptor,
    Resolver,
    TraitUseDescriptor,
} from '../types';
import { ClassVisitor } from '../Visitors/ClassVisitor';
import { FQNResolver } from './FQNResolver';
import { TestTagResolver } from './TestTagResolver';

export class PhpUnitResolver implements Resolver {
    private _classes: ClassDescriptor[] = [];
    private ns!: FQNResolver;
    private annotations!: TestTagResolver;

    get classes(): ClassDescriptor[] {
        return this._classes;
    }

    reset(): void {
        this._classes = [];
    }

    resolve(php: PHP): void {
        this.ns = php.getResolver(FQNResolver);
        this.annotations = php.getResolver(TestTagResolver);

        const visitor = php.getVisitor(ClassVisitor);
        this._classes = visitor.nodes.map((node) => this.buildClassDescriptor(node));
    }

    contribute(result: Partial<FileInfo>): void {
        result.classes = this._classes;
    }

    private buildClassDescriptor(node: ClassNode): ClassDescriptor {
        const name = node.name;
        const namespace = this.ns.namespace;
        const fqn = namespace ? `${namespace}\\${name}` : name;
        const parentFQN = node.extendsName ? this.ns.resolveFQN(node.extendsName) : undefined;
        const classAnnotations = this.annotations.parseAnnotations(node);

        const traitUseNodes: TraitUseNode[] = [];
        const constants: ConstantDescriptor[] = [];
        const methodNodes: MethodNode[] = [];

        for (const child of node.body) {
            if (child.kind === 'use_declaration') {
                traitUseNodes.push(child as TraitUseNode);
            } else if (child.kind === 'const_declaration') {
                constants.push({ name: (child as ConstDeclarationNode).name });
            } else if (child.kind === 'method_declaration') {
                methodNodes.push(child as MethodNode);
            }
        }

        const traitUses = collectTraitAdaptations(traitUseNodes, (raw) => this.ns.resolveFQN(raw));
        const methods = methodNodes.map((method) =>
            this.buildMethodDescriptor(method, methodNodes, node.body),
        );

        return {
            name,
            fqn,
            parentFQN,
            isAbstract: node.isAbstract,
            isTrait: node.kind === 'trait_declaration',
            range: node.loc,
            annotations: classAnnotations,
            traitUses,
            constants,
            methods,
        };
    }

    private buildMethodDescriptor(
        method: MethodNode,
        allMethodNodes: MethodNode[],
        classBody: AstNode[],
    ): MethodDescriptor {
        const methodAnnotations = this.annotations.parseAnnotations(method);

        return {
            name: method.name,
            visibility: method.visibility ?? '',
            isAbstract: method.isAbstract,
            range: method.loc,
            annotations: methodAnnotations,
            isTestMethod: this.annotations.isTest(method),
            dataProviderLabels:
                (methodAnnotations.dataset as string[]) ??
                ((methodAnnotations.dataProvider as string[]) ?? []).flatMap((name) => {
                    const provider = allMethodNodes.find((m) => m.name === name);
                    return provider ? resolveLabels(provider, classBody) : [];
                }),
        };
    }
}

function collectTraitAdaptations(
    traitUseNodes: TraitUseNode[],
    resolveFQN: (raw: string) => string,
): TraitUseDescriptor[] {
    const traitMap = new Map<string, TraitAdaptation[]>();

    for (const traitUse of traitUseNodes) {
        for (const name of traitUse.traits) {
            const fqn = resolveFQN(name);
            if (!traitMap.has(fqn)) {
                traitMap.set(fqn, []);
            }
        }

        for (const adapt of traitUse.adaptations) {
            const traitFQN = adapt.trait ? resolveFQN(adapt.trait) : undefined;
            const target = traitFQN ? traitMap.get(traitFQN) : undefined;

            if (adapt.kind === 'use_instead_of_clause') {
                target?.push({
                    kind: 'insteadof',
                    trait: traitFQN,
                    method: adapt.method,
                    instead: adapt.instead.map((i) => resolveFQN(i)),
                });
            } else if (adapt.kind === 'use_as_clause') {
                target?.push({
                    kind: 'as',
                    trait: traitFQN,
                    method: adapt.method,
                    alias: adapt.alias,
                    visibility: adapt.visibility,
                });
            }
        }
    }

    return Array.from(traitMap, ([traitFQN, adaptations]) => ({ traitFQN, adaptations }));
}
