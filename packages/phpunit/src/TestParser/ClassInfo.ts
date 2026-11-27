import type { TraitAdaptation } from '../Interpreter/types';
import type { TestDefinition } from '../types';

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
