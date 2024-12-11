import { TestDefinition, TestType } from './types';

export class Converter {
    generateUniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName'>): string {
        if (testDefinition.type === TestType.namespace) {
            return `namespace:${testDefinition.classFQN}`;
        }

        if (!testDefinition.methodName) {
            return testDefinition.classFQN!;
        }

        return `${testDefinition.classFQN}::${testDefinition.methodName}`;
    };

    generateLabel(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'className' | 'methodName' | 'annotations'>): string {
        if (testDefinition.annotations?.testdox && testDefinition.annotations.testdox.length > 0) {
            return testDefinition.annotations.testdox[testDefinition.annotations.testdox.length - 1];
        }

        if (testDefinition.methodName) {
            return testDefinition.methodName.replace(/`/g, '');
        }

        return testDefinition.className!;
    }
}

export const converter = new Converter();