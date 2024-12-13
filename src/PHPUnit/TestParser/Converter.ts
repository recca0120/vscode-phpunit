import { capitalize, snakeCase, titleCase, uncapitalize } from '../utils';
import { TestDefinition, TestType } from './types';

export class Converter {
    generateUniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        let { type, classFQN, methodName, annotations } = testDefinition;

        const isPest = /^P\\/.test(classFQN!);

        if (!isPest) {
            classFQN = classFQN!.replace(/Test$/i, '');
            const partsFQN = classFQN.replace(/Test$/i, '').split('\\');
            let className = titleCase(partsFQN.pop() ?? '');
            if (partsFQN.length === 0) {
                classFQN = className;
            } else {
                classFQN = `${className} (${classFQN})`;
            }

            if (type === TestType.namespace) {
                return `namespace:${classFQN}`;
            }

            if (type === TestType.class) {
                return classFQN;
            }

            let dataset = '';
            const matched = methodName!.match(/(?<methodName>.*)(?<dataset>\swith\sdata\sset\s[#"].+$)/);
            if (matched && matched.groups) {
                methodName = matched.groups['methodName'];
                dataset = matched.groups['dataset'];
            }

            methodName = capitalize(snakeCase(methodName!.replace(/_/g, ' ').replace(/^test/i, '').trim())).replace(/_/g, ' ') + dataset;
            if (annotations?.testdox && annotations.testdox.length > 0) {
                return [classFQN, annotations.testdox[annotations.testdox.length - 1]].join('::');
            }

            return [classFQN, methodName].join('::');
        }

        let id = classFQN!.replace(/^P\\/, '');

        if (type === TestType.namespace) {
            return `namespace:${id}`;
        }

        if (type === TestType.class) {
            return id;
        }

        let dataset = '';
        const matched = methodName!.match(/(?<methodName>.*)(?<dataset>\swith\sdata\sset\s[#"].+$)/);
        if (matched && matched.groups) {
            methodName = matched.groups['methodName'];
            dataset = matched.groups['dataset'];
        }

        methodName = methodName!.replace(/\*\//g, '{@*}') + dataset;
        if (annotations?.testdox && annotations.testdox.length > 0) {
            return [classFQN, annotations.testdox[annotations.testdox.length - 1]].join('::');
        }

        classFQN = uncapitalize(id).replace(/\\/g, '/') + '.php';

        return [classFQN, methodName].join('::');
    };

    generateLabel(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'className' | 'methodName' | 'annotations'>): string {
        const { type, classFQN, className, methodName, annotations } = testDefinition;

        if (annotations?.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
        }

        if (type === TestType.namespace) {
            return classFQN!.replace(/^P\\/g, '');
        }

        if (type === TestType.class) {
            return className ?? classFQN!.replace(/^P\\/g, '');
        }

        return methodName!.replace(/`/g, '');
    }

    generateSearchText(input: string) {
        return input.replace(/([\[\]()*])/g, '\\$1');
    }
}

export const converter = new Converter();