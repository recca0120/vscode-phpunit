import type {
    AstNode,
    ClassNode,
    ConstDeclarationNode,
    MethodNode,
    TraitUseNode,
} from '../AstParser/AstNode';
import { resolveLabels } from '../Expressions/resolveLabels';
import { AnnotationParser } from '../Metadata/AnnotationParser';
import { AttributeParser } from '../Metadata/AttributeParser';
import type { Metadata } from '../Metadata/Metadata';
import type { MetadataParser } from '../Metadata/MetadataParser';
import { MetadataParserChain } from '../Metadata/MetadataParserChain';
import { toAnnotations } from '../Metadata/toAnnotations';
import type { PHP } from '../PHP';
import type {
    ClassDescriptor,
    ConstantDescriptor,
    FileInfo,
    MethodDescriptor,
    Resolver,
    TraitAdaptation,
    TraitUseDescriptor,
} from '../types';
import { ClassVisitor } from '../Visitors/ClassVisitor';
import type { NamespaceScope } from '../Visitors/NamespaceVisitor';
import { FQNResolver } from './FQNResolver';

export class PhpUnitResolver implements Resolver {
    private _classes: ClassDescriptor[] = [];
    private ns!: FQNResolver;
    private metadata!: MetadataParser;

    get classes(): ClassDescriptor[] {
        return this._classes;
    }

    reset(): void {
        this._classes = [];
    }

    resolve(php: PHP): void {
        this.ns = php.getResolver(FQNResolver);
        const visitor = php.getVisitor(ClassVisitor);
        this._classes = visitor.nodes.map((node) =>
            this.buildClassDescriptor(node, visitor.scopeOf(node)),
        );
    }

    contribute(result: Partial<FileInfo>): void {
        result.classes = this._classes;
    }

    private buildClassDescriptor(node: ClassNode, scope?: NamespaceScope): ClassDescriptor {
        const resolveFQN = (raw: string) => this.ns.resolveFQN(raw, scope);
        this.metadata = new MetadataParserChain([
            new AttributeParser(resolveFQN),
            new AnnotationParser(),
        ]);
        const name = node.name;
        const namespace = scope?.name;
        const fqn = namespace ? `${namespace}\\${name}` : name;
        const parentFQN = node.extendsName ? resolveFQN(node.extendsName) : undefined;
        const classAnnotations = toAnnotations(this.metadata.forClass(node));

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

        const traitUses = collectTraitAdaptations(traitUseNodes, resolveFQN);
        const methods = methodNodes.map((method) =>
            this.buildMethodDescriptor(method, methodNodes, node.body),
        );

        return {
            name,
            fqn,
            namespaceRange: scope?.range,
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
        const metadata = this.metadata.forMethod(method);
        const methodAnnotations = toAnnotations(metadata);

        return {
            name: method.name,
            visibility: method.visibility ?? '',
            isAbstract: method.isAbstract,
            range: method.loc,
            annotations: methodAnnotations,
            isTestMethod: isTest(method, metadata),
            dataProviderLabels:
                (methodAnnotations.dataset as string[]) ??
                resolveLabels(
                    ((methodAnnotations.dataProvider as string[]) ?? []).flatMap(
                        (name) => allMethodNodes.find((m) => m.name === name) ?? [],
                    ),
                    classBody,
                ),
        };
    }
}

function isTest(method: MethodNode, metadata: Metadata[]): boolean {
    const visibility = method.visibility ?? '';
    if (visibility !== '' && visibility !== 'public') {
        return false;
    }
    if (method.name.startsWith('test')) {
        return true;
    }
    return metadata.some((item) => item.kind === 'test');
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
