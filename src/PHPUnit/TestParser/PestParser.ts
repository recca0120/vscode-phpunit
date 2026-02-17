import { type TestDefinition, TestType } from '../types';
import type { Parser } from './Parser';
import type { PhpAstNodeWrapper } from './php-parser/PhpAstNodeWrapper';

export class PestParser implements Parser {
    parse(definition: PhpAstNodeWrapper): TestDefinition[] | undefined {
        const getFunctions = (definition: PhpAstNodeWrapper) => {
            return definition
                .getFunctions()
                .filter((definition: PhpAstNodeWrapper) => definition.isTest())
                .map((definition: PhpAstNodeWrapper) => {
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
