import { TestDefinition, TestType } from './types';

export class Converter {
    generateUniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName'>): string {
        const type = testDefinition.type;
        let classFQN = testDefinition.classFQN!;
        let methodName = testDefinition.methodName;

        // const isPest = /^P\\/.test(classFQN);

        // if (isPest) {
        //     classFQN = classFQN.replace(/^P\\/, '');
        //     console.log(classFQN);
        // }

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (!methodName) {
            return classFQN;
        }

        return `${classFQN}::${methodName}`;
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