import { TestDefinition } from '../types';
import { Parser } from './Parser';
import { PHPDefinition } from './PHPDefinition';

export class PHPUnitParser implements Parser {
    parse(definition: PHPDefinition): TestDefinition[] | undefined {
        const testDefinitions: TestDefinition[] = [];
        const getParent = (definition: PHPDefinition) => {
            const testDefinition = definition.toTestDefinition();
            if (!definition.parent) {
                testDefinitions.push(testDefinition);

                return testDefinition;
            }

            let namespace = testDefinitions.find((item: TestDefinition) => item.namespace === definition.parent?.name);
            if (!namespace) {
                namespace = definition.parent.createNamespaceTestDefinition();
                testDefinitions.push(namespace);
            }
            (namespace.children as TestDefinition[]).push(testDefinition);

            return testDefinition;
        };

        definition.getClasses()
            .filter(definition => definition.isTest())
            .forEach(definition => {
                getParent(definition).children = (definition.children ?? [])
                    .filter(definition => definition.isTest())
                    .map(definition => definition.toTestDefinition());
            });

        return testDefinitions.length === 0 ? undefined : testDefinitions;
    }
}