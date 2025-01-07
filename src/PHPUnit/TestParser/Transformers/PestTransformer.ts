import { uncapitalize } from '../../utils';
import { TestDefinition, TestType } from '../types';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';

export class PestTransformer extends PHPUnitTransformer {
    fromLocationHit(locationHint: string, name: string) {
        locationHint = this.fixPestV2DataSet(locationHint, name);

        let file = '';
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            let id = locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/');
            const testId = id;
            file = id.split('::')[0];

            return { id, testId, file };
        }

        const methodName = matched.groups?.['method'];
        if (!methodName) {
            const id = name;
            const testId = name;

            return { id, testId, file };
        }

        const classFQN = matched.groups?.['classFQN'];
        const type = !methodName ? TestType.class : TestType.method;
        const id = this.uniqueId({ type: type, classFQN, methodName });
        const testId = id;
        // const testId = this.removeDataset(id);

        return { id, testId, file };
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

    private fixPestV2DataSet(locationHint: string, name: string) {
        const matched = name.match(/__pest_evaluable_(?<name>.+)/);
        if (matched && matched.groups?.name) {
            locationHint += '::' + matched.groups.name.replace(/_/g, ' ');
        }

        return locationHint;
    }
}