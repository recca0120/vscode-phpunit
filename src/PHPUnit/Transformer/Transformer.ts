import { TestResultIdentify } from '../ProblemMatcher';
import { TestDefinition, TestType } from '../types';

export abstract class Transformer {
    static generateSearchText(input: string) {
        return input.replace(/([\[\]()*+$!\\])/g, '\\$1').replace(/@/g, '[\\W]');
    }

    generateLabel(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'className' | 'methodName' | 'annotations' | 'id'> & {
        label?: string
    }): string {
        const { type, classFQN, className, methodName, annotations, label, id } = testDefinition;

        // Prioritize explicit label if provided
        if (label) {
            return label;
        }

        // Prioritize testdox annotation if available
        if (annotations?.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        // Generate label based on test type
        switch (type) {
            case TestType.namespace:
                // Remove Pest namespace prefix if present
                return classFQN?.replace(/^P\\/g, '') ?? '';
            case TestType.class:
                // Use className if available, otherwise generate from classFQN
                return className ?? classFQN?.replace(/^P\\/g, '') ?? '';
            case TestType.method:
                // Remove backticks from method name (Pest style)
                return methodName?.replace(/`/g, '') ?? '';
            default:
                // Fallback for other types or unexpected cases
                return testDefinition.id ?? 'Unknown Test'; // Use id as a fallback
        }
    }

    abstract uniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string ;

    abstract fromLocationHit(locationHint: string, name: string): TestResultIdentify

    protected abstract normalizeMethodName(methodName: string): string

    protected getMethodName(testDefinition: Pick<TestDefinition, 'methodName' | 'annotations'>): string {
        const { methodName, annotations } = testDefinition;

        // Prioritize testdox annotation for method name
        if (annotations?.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        // If no testdox, use the normalized method name
        const baseMethodName = this.normalizeMethodName(methodName ?? ''); // Use empty string if methodName is undefined

        // Extract dataset part if present
        const datasetMatch = methodName?.match(/(?<dataset>\swith\sdata\sset\s[#"].+$)/);
        const dataset = datasetMatch?.groups?.['dataset'] ?? '';

        return baseMethodName + dataset;
    }

    protected removeDataset(id: string): string {
        return id.replace(/\swith\sdata\sset\s[#"].+$/, '');
    }
}
