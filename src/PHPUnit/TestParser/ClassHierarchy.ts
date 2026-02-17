import { PHPUNIT_TESTCASE_FQN, type TestDefinition, TestType } from '../types';

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

export class ClassHierarchy {
    private registry = new Map<string, ClassInfo>();

    clear(): void {
        this.registry.clear();
    }

    register(info: ClassInfo): void {
        this.registry.set(info.classFQN, info);
    }

    get(classFQN: string): ClassInfo | undefined {
        return this.registry.get(classFQN);
    }

    extendsTestCase(classFQN: string): boolean {
        const visited = new Set<string>();
        let current: string | undefined = classFQN;
        while (current) {
            if (current === PHPUNIT_TESTCASE_FQN) {
                return true;
            }
            if (visited.has(current)) {
                return false;
            }
            visited.add(current);
            current = this.registry.get(current)?.parentFQN;
        }
        return false;
    }

    resolveInheritedMethods(classFQN: string): TestDefinition[] {
        const methodMap = new Map<string, TestDefinition>();
        this.walkAncestors(classFQN, (_current, info) => {
            if (!info) {
                return false;
            }
            // Own methods first
            for (const method of info.methods) {
                if (method.methodName && !methodMap.has(method.methodName)) {
                    methodMap.set(method.methodName, method);
                }
            }
            // Trait methods (priority: own > trait > parent)
            for (const method of this.resolveTraitMethods(info)) {
                if (method.methodName && !methodMap.has(method.methodName)) {
                    methodMap.set(method.methodName, method);
                }
            }
            return false;
        });
        return [...methodMap.values()];
    }

    enrichTests(tests: TestDefinition[]): TestDefinition[] {
        const result: TestDefinition[] = [];

        for (const test of tests) {
            if (test.type !== TestType.class) {
                const enriched = this.enrichNonClass(test);
                if (enriched) {
                    result.push(enriched);
                }
                continue;
            }

            const enriched = this.enrichClass(test);
            if (enriched) {
                result.push(enriched);
            }
        }

        return result;
    }

    private enrichNonClass(test: TestDefinition): TestDefinition | undefined {
        if (!test.children) {
            return test;
        }

        const enrichedChildren = this.enrichTests(test.children);
        if (enrichedChildren.length === 0) {
            return undefined;
        }

        return { ...test, children: enrichedChildren };
    }

    private enrichClass(test: TestDefinition): TestDefinition | undefined {
        const isTestCase = test.classFQN && this.extendsTestCase(test.classFQN);
        const hasOwnTests = test.children && test.children.length > 0;

        if (!isTestCase && !hasOwnTests) {
            return undefined;
        }

        if (!isTestCase || !test.classFQN) {
            return test;
        }

        const ownMethodNames = new Set(
            (test.children ?? []).map((m) => m.methodName).filter(Boolean),
        );

        const allMethods = this.resolveInheritedMethods(test.classFQN);
        const inheritedMethods = allMethods
            .filter((m) => m.methodName && !ownMethodNames.has(m.methodName))
            .map((m) => ({
                ...m,
                file: test.file,
                classFQN: test.classFQN,
                namespace: test.namespace,
                className: test.className,
                start: test.start,
                end: test.end,
            }));

        return {
            ...test,
            children: [...(test.children ?? []), ...inheritedMethods],
        };
    }

    getClassesByUri(uri: string): ClassInfo[] {
        return this.filterValues((info) => info.uri === uri);
    }

    getChildClasses(classFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.parentFQN === classFQN);
    }

    getTraitUsers(traitFQN: string): ClassInfo[] {
        return this.filterValues((info) => info.traitFQNs.includes(traitFQN));
    }

    private resolveTraitMethods(info: ClassInfo, visited?: Set<string>): TestDefinition[] {
        const collected = this.collectTraitMethods(info, visited ?? new Set<string>());
        this.applyInsteadofAdaptations(collected, info.traitAdaptations);
        this.applyAliasAdaptations(collected, info.traitAdaptations);

        return [...collected.values()].map((e) => e.method);
    }

    private collectTraitMethods(
        info: ClassInfo,
        seen: Set<string>,
    ): Map<string, { trait: string; method: TestDefinition }> {
        const collected = new Map<string, { trait: string; method: TestDefinition }>();

        for (const traitFQN of info.traitFQNs) {
            if (seen.has(traitFQN)) {
                continue;
            }
            seen.add(traitFQN);

            const traitInfo = this.registry.get(traitFQN);
            if (!traitInfo) {
                continue;
            }

            // Recursively resolve nested trait methods
            const nestedMethods = this.resolveTraitMethods(traitInfo, seen);
            for (const m of nestedMethods) {
                if (m.methodName && !collected.has(m.methodName)) {
                    collected.set(m.methodName, { trait: traitFQN, method: m });
                }
            }

            // Own methods of this trait
            for (const m of traitInfo.methods) {
                if (m.methodName) {
                    collected.set(m.methodName, { trait: traitFQN, method: m });
                }
            }
        }

        return collected;
    }

    private applyInsteadofAdaptations(
        collected: Map<string, { trait: string; method: TestDefinition }>,
        adaptations: TraitAdaptation[],
    ): void {
        for (const adapt of adaptations) {
            if (adapt.kind !== 'insteadof' || !adapt.trait || !adapt.instead) {
                continue;
            }
            const entry = collected.get(adapt.method);
            if (!entry) {
                continue;
            }
            if (entry.trait !== adapt.trait && !adapt.instead.includes(entry.trait)) {
                continue;
            }
            const preferredTrait = this.registry.get(adapt.trait);
            if (!preferredTrait) {
                continue;
            }
            const preferredMethod = preferredTrait.methods.find(
                (m) => m.methodName === adapt.method,
            );
            if (preferredMethod) {
                collected.set(adapt.method, { trait: adapt.trait, method: preferredMethod });
            }
        }
    }

    private applyAliasAdaptations(
        collected: Map<string, { trait: string; method: TestDefinition }>,
        adaptations: TraitAdaptation[],
    ): void {
        for (const adapt of adaptations) {
            if (adapt.kind !== 'as' || !adapt.alias) {
                continue;
            }

            let sourceMethod: TestDefinition | undefined;
            if (adapt.trait) {
                const traitInfo = this.registry.get(adapt.trait);
                sourceMethod = traitInfo?.methods.find((m) => m.methodName === adapt.method);
            } else {
                sourceMethod = collected.get(adapt.method)?.method;
            }

            if (sourceMethod) {
                collected.set(adapt.alias, {
                    trait: adapt.trait ?? '',
                    method: { ...sourceMethod, methodName: adapt.alias },
                });
            }
        }
    }

    private walkAncestors(
        classFQN: string,
        visitor: (classFQN: string, info: ClassInfo | undefined) => boolean,
    ): void {
        const visited = new Set<string>();
        let current: string | undefined = classFQN;
        while (current) {
            if (visited.has(current)) {
                return;
            }
            visited.add(current);
            const info = this.registry.get(current);
            if (visitor(current, info)) {
                return;
            }
            if (!info) {
                return;
            }
            current = info.parentFQN;
        }
    }

    private filterValues(predicate: (info: ClassInfo) => boolean): ClassInfo[] {
        const result: ClassInfo[] = [];
        for (const info of this.registry.values()) {
            if (predicate(info)) {
                result.push(info);
            }
        }
        return result;
    }
}
