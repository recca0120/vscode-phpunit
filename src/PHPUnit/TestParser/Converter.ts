import { uncapitalize } from 'string-ts';
import { TestDefinition, TestType } from './types';

export class Converter {
    generateUniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        const type = testDefinition.type;
        let classFQN = testDefinition.classFQN!;
        let methodName = testDefinition.methodName;
        const annotations = testDefinition.annotations;

        const isPest = /^P\\/.test(classFQN);

        if (isPest) {
            const id = uncapitalize(classFQN.replace(/^P\\/, '')) + '.php';

            if (type === TestType.namespace) {
                return `namespace:${id}`;
            }

            return methodName ? `${id}::${methodName}` : id;
        }

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (methodName) {
            // classFQN = classFQN.replace(/Test$/i, '');
            // const partsFQN = classFQN.replace(/Test$/i, '').split('\\');
            // const className = partsFQN.pop()!;
            // classFQN = `${className} (${classFQN})`;
            // methodName = capitalize(methodName.replace(/^test_/i, '')).replace(/_/g, ' ');
            //
            // if (testDefinition.annotations?.testdox && testDefinition.annotations.testdox.length > 0) {
            //     return classFQN + '::' + testDefinition.annotations.testdox[testDefinition.annotations.testdox.length - 1];
            // }

            return `${classFQN}::${methodName}`;
        }

        return classFQN;

    };

    generateLabel(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'className' | 'methodName' | 'annotations'>): string {
        if (testDefinition.annotations?.testdox && testDefinition.annotations.testdox.length > 0) {
            return testDefinition.annotations.testdox[testDefinition.annotations.testdox.length - 1];
        }

        if (testDefinition.methodName) {
            return testDefinition.methodName.replace(/`/g, '');
        }

        return testDefinition.className ?? testDefinition.classFQN!.replace(/^P\\/g, '');
    }
}

export const converter = new Converter();