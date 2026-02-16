import type { TestDefinition } from '../types';
import { type ClassInfo, ClassRegistry } from './ClassRegistry';
import type { Parser } from './Parser';
import type { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

export class PHPUnitParser implements Parser {
    constructor(private classRegistry: ClassRegistry = new ClassRegistry()) {}

    parse(definition: PhpAstNodeWrapper): TestDefinition[] | undefined {
        const testDefinitions: TestDefinition[] = [];
        const getParent = (definition: PhpAstNodeWrapper) => {
            const testDefinition = definition.toTestDefinition();
            if (!definition.parent) {
                testDefinitions.push(testDefinition);

                return testDefinition;
            }

            let namespace = testDefinitions.find(
                (item: TestDefinition) => item.namespace === definition.parent?.name,
            );
            if (!namespace) {
                namespace = definition.parent.createNamespaceTestDefinition();
                testDefinitions.push(namespace);
            }
            (namespace.children as TestDefinition[]).push(testDefinition);

            return testDefinition;
        };

        const allClasses = definition.getClasses();

        // Register all classes in the registry (including abstract)
        for (const classDef of allClasses) {
            this.registerClass(classDef);
        }

        // Use extendsTestCase for registry-aware filtering
        const testClasses = allClasses.filter((cls) => this.isTestClass(cls));

        for (const classDef of testClasses) {
            const parent = getParent(classDef);

            // Get own test methods
            const ownMethods = (classDef.children ?? [])
                .filter((m) => m.isTest())
                .map((m) => m.toTestDefinition());

            if (!classDef.classFQN) {
                parent.children = ownMethods;
                continue;
            }

            // Get inherited methods
            const inheritedMethods = this.getInheritedMethods(classDef);
            parent.children = [...ownMethods, ...inheritedMethods];
        }

        return testDefinitions.length === 0 ? undefined : testDefinitions;
    }

    private registerClass(classDef: PhpAstNodeWrapper): void {
        if (!classDef.classFQN) {
            return;
        }

        const methods: TestDefinition[] = classDef
            .getMethods()
            .filter((m) => m.isTestMethod())
            .map((m) => m.toTestDefinition());

        const { traitFQNs, adaptations } = classDef.getTraitUses();

        const info: ClassInfo = {
            uri: classDef.file,
            classFQN: classDef.classFQN,
            parentFQN: classDef.parentFQN,
            traitFQNs,
            traitAdaptations: adaptations,
            kind: classDef.isTrait ? 'trait' : 'class',
            isAbstract: classDef.isAbstract,
            methods,
        };

        this.classRegistry.register(info);
    }

    private isTestClass(classDef: PhpAstNodeWrapper): boolean {
        if (classDef.isAbstract) {
            return false;
        }

        if (classDef.classFQN && this.classRegistry.extendsTestCase(classDef.classFQN)) {
            return true;
        }

        return classDef.isTest();
    }

    private getInheritedMethods(classDef: PhpAstNodeWrapper): TestDefinition[] {
        if (!classDef.classFQN) {
            return [];
        }

        const ownMethodNames = new Set(
            (classDef.children ?? []).filter((m) => m.isTest()).map((m) => m.name),
        );

        const allMethods = this.classRegistry.resolveInheritedMethods(classDef.classFQN);

        return allMethods
            .filter((m) => m.methodName && !ownMethodNames.has(m.methodName))
            .map((m) => ({
                ...m,
                file: classDef.file,
                classFQN: classDef.classFQN,
                namespace: classDef.parent?.name,
                className: classDef.name,
                start: classDef.position.start,
                end: classDef.position.end,
            }));
    }
}
