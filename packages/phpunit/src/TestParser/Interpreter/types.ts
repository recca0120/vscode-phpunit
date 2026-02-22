export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface FileInfo {
    namespace?: string;
    namespaceRange?: Range;
    programRange: Range;
    classes: ClassDescriptor[];
    pestCalls: PestCallDescriptor[];
}

import type { TraitAdaptation } from '../ClassHierarchy';
export type { TraitAdaptation };

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
    annotations: Record<string, unknown>;
    traitUses: TraitUseDescriptor[];
    constants: ConstantDescriptor[];
    methods: MethodDescriptor[];
}

export interface MethodDescriptor {
    name: string;
    visibility: string;
    isAbstract: boolean;
    range: Range;
    annotations: Record<string, unknown>;
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
