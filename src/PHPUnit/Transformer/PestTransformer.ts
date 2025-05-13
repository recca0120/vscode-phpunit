import { TestDefinition, TestType } from '../types';
import { uncapitalize } from '../utils';
import { PestV1Fixer, PestV2Fixer } from './PestFixer';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';

export class PestTransformer extends PHPUnitTransformer {
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
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>[\w\s]+)\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            const location = PestV1Fixer.fixLocationHint(locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/'));
            const id = this.removeDataset(this.normalizeMethodName(PestV2Fixer.fixId(location, name)));
            const file = location.split('::')[0];

            return { id, file };
        }

        const methodName = this.normalizeMethodName(matched.groups?.method ?? '');
        if (!methodName) {
            return { id: this.removeDataset(name), file: '' };
        }

        const classFQN = matched.groups?.classFQN;
        const type = !methodName ? TestType.class : TestType.method;
        const id = this.removeDataset(this.uniqueId({ type: type, classFQN, methodName }));

        return { id, file: '' };
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\{@\*}/g, '*/');
    }
}