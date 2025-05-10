import { TestDefinition, TestType } from '../types';
import { Parser } from './Parser';
import { PHPDefinition } from './PHPDefinition';

export class PestParser implements Parser {
    parse(definition: PHPDefinition): TestDefinition[] | undefined {
        const testDefinition = definition.toTestDefinition();
        const childTestDefinitions = this.parseChildDefinitions(definition);

        if (childTestDefinitions.length === 0) {
            return undefined;
        }

        // Assign parsed children to the top-level test definition
        testDefinition.children = childTestDefinitions;

        // Create a parent namespace definition if needed (based on original logic)
        const parent = definition.createNamespaceTestDefinition();
        parent.children = [testDefinition];

        return [parent];
    }

    private parseChildDefinitions(definition: PHPDefinition): TestDefinition[] {
        const childDefinitions: TestDefinition[] = [];

        for (const child of definition.getFunctions()) {
            if (child.isTest()) {
                const childTestDefinition = child.toTestDefinition();
                if (child.type === TestType.describe) {
                    // Recursively parse children for describe blocks
                    childTestDefinition.children = this.parseChildDefinitions(child);
                }
                childDefinitions.push(childTestDefinition);
            }
        }

        return childDefinitions;
    }
}
