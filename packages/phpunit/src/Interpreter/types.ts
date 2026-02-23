import type { Annotations, Range } from '../types';
import type { AstNode, ClassNode, MethodNode } from './AstParser/AstNode';
import type { PHP } from './PHP';

export type Annotatable = ClassNode | MethodNode;

export type { Range };

export interface Visitor {
    readonly nodeKinds: string[];
    initialize?(php: PHP): void;
    reset?(): void;
    visit(node: AstNode, php: PHP): void;
}

export interface Resolver {
    resolve(php: PHP): void;
    reset?(): void;
    contribute?(result: Partial<FileInfo>, php: PHP): void;
}

export interface FileInfo {
    namespace?: string;
    namespaceRange?: Range;
    programRange: Range;
    classes: ClassDescriptor[];
    pestCalls: PestCallDescriptor[];
}

import type { TraitAdaptation } from '../TestParser/ClassHierarchy';

export interface TraitUseDescriptor {
    traitFQN: string;
    adaptations: TraitAdaptation[];
}

export interface ConstantDescriptor {
    name: string;
}

export interface ClassDescriptor {
    name: string;
    fqn: string;
    parentFQN?: string;
    isAbstract: boolean;
    isTrait: boolean;
    range: Range;
    annotations: Annotations;
    traitUses: TraitUseDescriptor[];
    constants: ConstantDescriptor[];
    methods: MethodDescriptor[];
}

export interface MethodDescriptor {
    name: string;
    visibility: string;
    isAbstract: boolean;
    range: Range;
    annotations: Annotations;
    isTestMethod: boolean;
    dataProviderLabels: string[];
}

export interface PestCallDescriptor {
    fnName: string;
    description?: string;
    range: Range;
    datasets: string[];
    children: PestCallDescriptor[];
    chainCalls: string[];
}
