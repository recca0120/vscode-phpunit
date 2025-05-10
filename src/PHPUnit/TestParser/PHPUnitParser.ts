import { TestDefinition } from '../types';
import { Parser } from './Parser';
import { PHPDefinition } from './PHPDefinition';

export class PHPUnitParser implements Parser {
    // Array to hold the top-level test definitions (namespaces or classes without namespace)
    private testDefinitions: TestDefinition[] = [];

    parse(definition: PHPDefinition): TestDefinition[] | undefined {
        this.testDefinitions = []; // Reset for each parse call

        definition.getClasses()
            .filter(classDefinition => classDefinition.isTest())
            .forEach(classDefinition => {
                // Find or create the parent test suite (class) definition
                const testSuiteDefinition = this.findOrCreateParentSuite(classDefinition);

                // Add test methods as children of the test suite
                testSuiteDefinition.children = (classDefinition.children ?? []) // Children of a class are methods
                    .filter(methodDefinition => methodDefinition.isTest())
                    .map(methodDefinition => methodDefinition.toTestDefinition());
            });

        return this.testDefinitions.length === 0 ? undefined : this.testDefinitions;
    }

    // Extracted logic from the original getParent function
    private findOrCreateParentSuite(definition: PHPDefinition): TestDefinition {
        const currentTestDefinition = definition.toTestDefinition();

        if (!definition.parent) {
            // This is a top-level definition (like a class directly under program/namespace)
            this.testDefinitions.push(currentTestDefinition);
            return currentTestDefinition;
        }

        // Find or create the parent namespace definition
        let parentNamespace = this.testDefinitions.find((item: TestDefinition) => item.namespace === definition.parent?.name);
        if (!parentNamespace) {
            parentNamespace = definition.parent.createNamespaceTestDefinition();
            this.testDefinitions.push(parentNamespace);
        }

        // Add the current test definition (suite) to the parent namespace's children
        if (!parentNamespace.children) {
            parentNamespace.children = [];
        }
        parentNamespace.children.push(currentTestDefinition);

        return currentTestDefinition;
    }
}
