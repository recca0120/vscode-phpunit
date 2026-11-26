import type { TestDefinition } from '../types';

export interface TraitAdaptation {
    kind: 'insteadof' | 'as';
    trait?: string;
    method: string;
    instead?: string[];
    alias?: string;
    visibility?: string;
}

export interface ClassInfo {
    uri: string;
    classFQN: string;
    parentFQN?: string;
    traitFQNs: string[];
    traitAdaptations: TraitAdaptation[];
    kind: 'class' | 'trait';
    isAbstract: boolean;
    methods: TestDefinition[];
}
