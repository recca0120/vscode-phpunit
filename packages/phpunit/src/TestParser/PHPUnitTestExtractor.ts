import type { TestDefinition } from '../types';
import type { ClassInfo } from './ClassHierarchy';
import { dataProviderParser } from './DataProviderParser';
import type { ParseResult, TestExtractor } from './TestExtractor';
import type { TestNode } from './TestNode';

export class PHPUnitTestExtractor implements TestExtractor {
    extract(definition: TestNode): ParseResult | undefined {
        const testDefinitions: TestDefinition[] = [];
        const classes: ClassInfo[] = [];

        const allClasses = definition.getClasses();

        for (const classDef of allClasses) {
            const methods = classDef.getMethods();
            const { traitFQNs, adaptations } = classDef.getTraitUses();

            if (classDef.classFQN) {
                classes.push({
                    uri: classDef.file,
                    classFQN: classDef.classFQN,
                    parentFQN: classDef.parentFQN,
                    traitFQNs,
                    traitAdaptations: adaptations,
                    kind: classDef.isTrait ? 'trait' : 'class',
                    isAbstract: classDef.isAbstract,
                    methods: methods
                        .filter((m) => m.isTestMethod())
                        .map((m) => m.toTestDefinition()),
                });
            }

            if (classDef.isAbstract || classDef.isTrait) {
                continue;
            }

            const parent = this.getOrCreateParent(testDefinitions, classDef);
            parent.children = methods
                .filter((m) => m.isTest())
                .map((m) => this.buildMethodDefinition(m, methods));
        }

        if (testDefinitions.length === 0 && classes.length === 0) {
            return undefined;
        }

        return { tests: testDefinitions, classes };
    }

    private buildMethodDefinition(method: TestNode, allMethods: TestNode[]): TestDefinition {
        const def = method.toTestDefinition();

        const providers = (def.annotations?.dataProvider as string[]) ?? [];
        if (providers.length === 0 || def.annotations?.dataset) {
            return def;
        }

        const providerMethod = allMethods.find((m) => m.name === providers[0]);
        if (!providerMethod) {
            return def;
        }

        const dataset = dataProviderParser.parse(providerMethod.node);
        if (dataset.length > 0) {
            def.annotations = { ...def.annotations, dataset };
        }

        return def;
    }

    private getOrCreateParent(
        testDefinitions: TestDefinition[],
        classDef: TestNode,
    ): TestDefinition {
        const testDefinition = classDef.toTestDefinition();
        if (!classDef.parent) {
            testDefinitions.push(testDefinition);
            return testDefinition;
        }

        let namespace = testDefinitions.find(
            (item: TestDefinition) => item.namespace === classDef.parent?.name,
        );
        if (!namespace) {
            namespace = classDef.parent.createNamespaceTestDefinition();
            testDefinitions.push(namespace);
        }
        (namespace.children as TestDefinition[]).push(testDefinition);

        return testDefinition;
    }
}
