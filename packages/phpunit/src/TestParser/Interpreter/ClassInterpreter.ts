import type {
    AstNode,
    ClassNode,
    ConstDeclarationNode,
    MethodNode,
    NamespaceNode,
} from '../AstParser/AstNode';
import { getAstChildren } from '../AstParser/AstNode';
import { AnnotationParser } from './AnnotationParser';
import { AttributeParser } from './AttributeParser';
import { dataProviderParser } from './DataProviderParser';
import type { FQNResolver } from './FQNResolver';
import { parseTraitUses } from './TraitUseParser';
import { toRange } from './toRange';
import type {
    ClassDescriptor,
    ConstantDescriptor,
    MethodDescriptor,
    TraitUseDescriptor,
} from './types';

const annotationParser = new AnnotationParser();
const attributeParser = new AttributeParser();

export function collectClassDescriptors(
    ast: AstNode,
    namespaceNode: NamespaceNode | undefined,
    resolver: FQNResolver,
): ClassDescriptor[] {
    const classNodes = collectClassNodes(ast, namespaceNode);
    const namespace = namespaceNode?.name;

    return classNodes.map((node) => buildClassDescriptor(node, namespace, resolver));
}

function collectClassNodes(ast: AstNode, namespaceNode: NamespaceNode | undefined): ClassNode[] {
    const source = namespaceNode ? namespaceNode.children : getAstChildren(ast);
    const results: ClassNode[] = [];

    for (const node of source) {
        if (node.kind === 'class_declaration' || node.kind === 'trait_declaration') {
            results.push(node);
        }
    }

    return results;
}

function buildClassDescriptor(
    node: ClassNode,
    namespace: string | undefined,
    resolver: FQNResolver,
): ClassDescriptor {
    const name = node.name;
    const fqn = namespace ? `${namespace}\\${name}` : name;
    const parentFQN = node.extendsName ? resolver.resolve(node.extendsName) : undefined;
    const annotations = {
        ...annotationParser.parse(node),
        ...attributeParser.parse(node),
    };

    const traitUses = collectTraitUses(node.body, resolver);
    const constants = collectConstants(node.body);
    const methods = collectMethods(node);

    return {
        name,
        fqn,
        parentFQN,
        isAbstract: node.isAbstract,
        isTrait: node.kind === 'trait_declaration',
        range: toRange(node.loc),
        annotations,
        traitUses,
        constants,
        methods,
    };
}

function collectTraitUses(body: AstNode[], resolver: FQNResolver): TraitUseDescriptor[] {
    const { traitFQNs, adaptations } = parseTraitUses(body, (raw) => resolver.resolve(raw));
    if (traitFQNs.length === 0) {
        return [];
    }
    return traitFQNs.map((traitFQN) => ({
        traitFQN,
        adaptations: adaptations.filter((a) => a.trait === traitFQN),
    }));
}

function collectConstants(body: AstNode[]): ConstantDescriptor[] {
    const result: ConstantDescriptor[] = [];
    for (const node of body) {
        if (node.kind !== 'const_declaration') {
            continue;
        }
        const constNode = node as ConstDeclarationNode;
        result.push({ name: constNode.name });
    }
    return result;
}

function collectMethods(classNode: ClassNode): MethodDescriptor[] {
    const allMethodNodes = classNode.body.filter(
        (node): node is MethodNode => node.kind === 'method_declaration',
    );

    return allMethodNodes.map((method) =>
        buildMethodDescriptor(method, allMethodNodes, classNode.body),
    );
}

function buildMethodDescriptor(
    method: MethodNode,
    allMethodNodes: MethodNode[],
    classBody: AstNode[],
): MethodDescriptor {
    const annotations = {
        ...annotationParser.parse(method),
        ...attributeParser.parse(method),
    };

    return {
        name: method.name,
        visibility: method.visibility ?? '',
        isAbstract: method.isAbstract,
        range: toRange(method.loc),
        annotations,
        isTestMethod: isTest(method),
        dataProviderLabels: resolveDataProviderLabels(annotations, allMethodNodes, classBody),
    };
}

function isTest(method: MethodNode): boolean {
    const visibility = method.visibility ?? '';
    if (visibility !== '' && visibility !== 'public') {
        return false;
    }

    return (
        method.name.startsWith('test') ||
        annotationParser.isTest(method) ||
        attributeParser.isTest(method)
    );
}

function resolveDataProviderLabels(
    annotations: Record<string, unknown>,
    allMethods: MethodNode[],
    classBody: AstNode[],
): string[] {
    if (annotations.dataset) {
        return annotations.dataset as string[];
    }

    const providers = (annotations.dataProvider as string[]) ?? [];
    if (providers.length === 0) {
        return [];
    }

    const labels: string[] = [];
    for (const providerName of providers) {
        const providerMethod = allMethods.find((m) => m.name === providerName);
        if (!providerMethod) {
            continue;
        }
        labels.push(...dataProviderParser.parse(providerMethod, classBody));
    }

    return labels;
}
