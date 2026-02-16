import type { TestDefinition } from '../types';
import type { ClassInfo, ClassRegistry } from './ClassRegistry';
import type { Parser } from './Parser';
import type { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

export class PHPUnitParser implements Parser {
    private classRegistry?: ClassRegistry;

    setClassRegistry(registry: ClassRegistry): void {
        this.classRegistry = registry;
    }

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
        if (this.classRegistry) {
            for (const classDef of allClasses) {
                this.registerClass(classDef);
            }
        }

        // For classes with registry: use extendsTestCase instead of isTest
        const testClasses = this.classRegistry
            ? allClasses.filter((cls) => this.isTestClass(cls))
            : allClasses.filter((cls) => cls.isTest());

        for (const classDef of testClasses) {
            const parent = getParent(classDef);

            // Get own test methods
            const ownMethods = (classDef.children ?? [])
                .filter((m) => m.isTest())
                .map((m) => m.toTestDefinition());

            if (this.classRegistry && classDef.classFQN) {
                // Get inherited methods
                const inheritedMethods = this.getInheritedMethods(classDef);
                parent.children = [...ownMethods, ...inheritedMethods];
            } else {
                parent.children = ownMethods;
            }
        }

        return testDefinitions.length === 0 ? undefined : testDefinitions;
    }

    private registerClass(classDef: PhpAstNodeWrapper): void {
        if (!this.classRegistry || !classDef.classFQN) {
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
        // Abstract classes are never test classes themselves
        if (classDef.isAbstract) {
            return false;
        }

        // If registry can confirm inheritance from TestCase, use that
        if (this.classRegistry && classDef.classFQN) {
            if (this.classRegistry.extendsTestCase(classDef.classFQN)) {
                return true;
            }
        }

        // Fall back to the original heuristic (name ends with Test + has test methods)
        return classDef.isTest();
    }

    private getInheritedMethods(classDef: PhpAstNodeWrapper): TestDefinition[] {
        if (!this.classRegistry || !classDef.classFQN) {
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
                // Point to the child class
                file: classDef.file,
                classFQN: classDef.classFQN,
                namespace: classDef.parent?.name,
                className: classDef.name,
                // Use the child class position for inherited methods
                start: classDef.position.start,
                end: classDef.position.end,
            }));
    }
}
