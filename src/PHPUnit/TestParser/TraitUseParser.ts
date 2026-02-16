import type { Identifier, Name, Node } from 'php-parser';
import type { TraitAdaptation } from './ClassRegistry';

type AST = Node & {
    name?: Identifier | string;
    body?: Node[];
};

export interface TraitUseResult {
    traitFQNs: string[];
    adaptations: TraitAdaptation[];
}

export class TraitUseParser {
    parse(body: Node[], resolveFQN: (raw: string) => string): TraitUseResult {
        const traitFQNs: string[] = [];
        const adaptations: TraitAdaptation[] = [];

        for (const child of body as AST[]) {
            if (child.kind !== 'traituse') {
                continue;
            }

            this.parseTraitNames(child, resolveFQN, traitFQNs);
            this.parseAdaptations(child, resolveFQN, adaptations);
        }

        return { traitFQNs, adaptations };
    }

    private parseTraitNames(
        traituse: AST,
        resolveFQN: (raw: string) => string,
        traitFQNs: string[],
    ): void {
        const traits = ((traituse as unknown as { traits: unknown[] }).traits ?? []) as unknown[];
        for (const t of traits) {
            const name = extractName(t);
            if (name) {
                traitFQNs.push(resolveFQN(name));
            }
        }
    }

    private parseAdaptations(
        traituse: AST,
        resolveFQN: (raw: string) => string,
        adaptations: TraitAdaptation[],
    ): void {
        const adaptNodes = ((traituse as unknown as { adaptations: unknown[] | null })
            .adaptations ?? []) as AST[];

        for (const adapt of adaptNodes) {
            if (adapt.kind === 'traitprecedence') {
                this.parsePrecedence(adapt, resolveFQN, adaptations);
            } else if (adapt.kind === 'traitalias') {
                this.parseAlias(adapt, resolveFQN, adaptations);
            }
        }
    }

    private parsePrecedence(
        adapt: AST,
        resolveFQN: (raw: string) => string,
        adaptations: TraitAdaptation[],
    ): void {
        const a = adapt as unknown as {
            trait: unknown;
            method: unknown;
            instead: unknown[];
        };
        const traitName = extractName(a.trait);
        const methodName = extractName(a.method);
        if (!methodName) {
            return;
        }

        const insteadNames = (a.instead ?? []).map((i) => resolveFQN(extractName(i) ?? ''));
        adaptations.push({
            kind: 'insteadof',
            trait: traitName ? resolveFQN(traitName) : undefined,
            method: methodName,
            instead: insteadNames,
        });
    }

    private parseAlias(
        adapt: AST,
        resolveFQN: (raw: string) => string,
        adaptations: TraitAdaptation[],
    ): void {
        const a = adapt as unknown as {
            trait: unknown;
            method: unknown;
            as: unknown;
            visibility: string | null;
        };
        const traitName = extractName(a.trait);
        const methodName = extractName(a.method);
        if (!methodName) {
            return;
        }

        const alias = extractName(a.as);
        adaptations.push({
            kind: 'as',
            trait: traitName ? resolveFQN(traitName) : undefined,
            method: methodName,
            alias: alias ?? undefined,
            visibility: a.visibility || undefined,
        });
    }
}

function extractName(node: unknown): string | undefined {
    if (!node) {
        return undefined;
    }
    if (typeof node === 'string') {
        return node;
    }
    return (node as Name).name ?? (node as Identifier).name;
}
