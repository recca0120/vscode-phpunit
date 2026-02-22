import type { AstNode, TraitUseNode } from '../AstParser/AstNode';
import type { TraitAdaptation } from '../ClassHierarchy';

export interface TraitUseResult {
    traitFQNs: string[];
    adaptations: TraitAdaptation[];
}

export function parseTraitUses(
    body: AstNode[],
    resolveFQN: (raw: string) => string,
): TraitUseResult {
    const traitFQNs: string[] = [];
    const adaptations: TraitAdaptation[] = [];

    for (const child of body) {
        if (child.kind !== 'use_declaration') {
            continue;
        }

        const traitUse = child as TraitUseNode;

        for (const name of traitUse.traits) {
            traitFQNs.push(resolveFQN(name));
        }

        for (const adapt of traitUse.adaptations) {
            if (adapt.kind === 'use_instead_of_clause') {
                adaptations.push({
                    kind: 'insteadof',
                    trait: adapt.trait ? resolveFQN(adapt.trait) : undefined,
                    method: adapt.method,
                    instead: adapt.instead.map((i) => resolveFQN(i)),
                });
            } else if (adapt.kind === 'use_as_clause') {
                adaptations.push({
                    kind: 'as',
                    trait: adapt.trait ? resolveFQN(adapt.trait) : undefined,
                    method: adapt.method,
                    alias: adapt.alias,
                    visibility: adapt.visibility,
                });
            }
        }
    }

    return { traitFQNs, adaptations };
}
