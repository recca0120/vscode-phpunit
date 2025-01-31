import { TestDefinition, TestType } from '../types';
import { Parser } from './Parser';
import { PHPDefinition } from './PHPDefinition';

export class PestParser implements Parser {
    parse(definition: PHPDefinition): TestDefinition[] | undefined {
        const getFunctions = (definition: PHPDefinition) => {
            return definition.getFunctions()
                .filter((definition: PHPDefinition) => definition.isTest())
                .map((definition: PHPDefinition) => {
                    const testDefinition = definition.toTestDefinition();

                    if (definition.type === TestType.describe) {
                        testDefinition.children = getFunctions(definition);
                    }

                    return testDefinition;
                });
        };

        const testDefinition = definition.toTestDefinition();
        testDefinition.children = getFunctions(definition);

        if (testDefinition.children.length === 0) {
            return undefined;
        }

        const parent = definition.createNamespaceTestDefinition();
        parent.children = [testDefinition];

        return [parent];
    }
}