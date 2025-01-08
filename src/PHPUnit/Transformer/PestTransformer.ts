import { TestResult } from '../ProblemMatcher';
import { TestDefinition, TestType } from '../types';
import { capitalize, uncapitalize } from '../utils';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';

export class PestTransformer extends PHPUnitTransformer {
    private static prefix = '__pest_evaluable_';

    static evaluable(code: string) {
        code = code.replace(/\{@\*}/g, '*/');

        return this.prefix + code.replace(/_/g, '__').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_');
    }

    static methodName(methodName: string) {
        methodName = methodName.replace(/\{@\*}/g, '*/');
        const matched = methodName.match(/(?<method>.*)\swith\sdata\sset\s(?<dataset>.+)/);
        let dataset = '';
        if (matched) {
            methodName = matched.groups!.method;
            dataset = matched.groups!.dataset.replace(/\|'/g, '\'');
        }

        return this.prefix + this.evaluable(methodName) + dataset;
    }

    static hasPrefix(id?: string) {
        return id && new RegExp(this.prefix).test(id);
    }

    static isEqualsPestV2DataSetId(result: TestResult, testItemId: string) {
        if (!('id' in result) || !this.hasPrefix(result.id)) {
            return false;
        }

        let [classFQN, method] = testItemId.split('::');
        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, this.methodName(method)].join('::') === result.id;
    }

    uniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        if (!TransformerFactory.isPest(testDefinition.classFQN!)) {
            return super.uniqueId(testDefinition);
        }

        let { type, classFQN } = testDefinition;
        classFQN = classFQN!.replace(/^P\\/, '');

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [uncapitalize(classFQN).replace(/\\/g, '/') + '.php', this.getMethodName(testDefinition)].join('::');
    };

    fromLocationHit(locationHint: string, name: string) {
        let file = '';
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            let id = locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/');
            file = id.split('::')[0];
            if (PestTransformer.hasPrefix(name)) {
                id = name;
            }

            return { id, file };
        }

        const methodName = matched.groups?.method;
        if (!methodName) {
            return { id: name, file };
        }

        const classFQN = matched.groups?.['classFQN'];
        const type = !methodName ? TestType.class : TestType.method;
        const id = this.uniqueId({ type: type, classFQN, methodName });

        return { id, file };
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\*\//g, '{@*}');
    }
}