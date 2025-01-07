import { TestDefinition, TestType } from '../TestParser/types';
import { capitalize, uncapitalize } from '../utils';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';

export class PestTransformer extends PHPUnitTransformer {
    private static prefix = '__pest_evaluable_';

    fromLocationHit(locationHint: string, name: string) {
        let file = '';
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            let id = locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/');
            file = id.split('::')[0];
            if (/__pest_evaluable/.test(name)) {
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

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\*\//g, '{@*}');
    }

    static hasPrefix(id?: string) {
        return id && new RegExp(this.prefix).test(id);
    }

    static evaluable(code: string) {
        return this.prefix + code.replace(/_/g, '__').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_');
    }

    static pestId(id: string) {
        let [classFQN, method] = id.split('::');

        method = method.replace(/\{@\*}/g, '*/');
        const matched = method.match(/(?<method>.*)\swith\sdata\sset\s(?<dataset>.+)/);
        let dataset = '';
        if (matched) {
            method = matched.groups!.method;
            dataset = matched.groups!.dataset.replace(/\|'/g, '\'');
        }

        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, this.evaluable(method) + dataset].join('::');
    }
}