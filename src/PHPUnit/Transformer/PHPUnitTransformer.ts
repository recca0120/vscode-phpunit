import { TestDefinition, TestType } from '../types';
import { capitalize, snakeCase, titleCase } from '../utils';
import { Transformer } from './Transformer';

export class PHPUnitTransformer extends Transformer {
    uniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        let { type, classFQN } = testDefinition;
        classFQN = classFQN!.replace(/Test$/i, '');
        const partsFQN = classFQN.replace(/Test$/i, '').split('\\');
        const className = titleCase(partsFQN.pop() ?? '');
        classFQN = partsFQN.length === 0 ? className : `${className} (${classFQN})`;

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [classFQN, this.getMethodName({ methodName: testDefinition.methodName })].join('::');
    };

    fromLocationHit(locationHint: string, _name: string) {
        const partsLocation = locationHint.replace(/^php_qn:\/\//, '').replace(/::\\/g, '::').split('::');
        const file = partsLocation.shift();
        const [classFQN, methodName] = partsLocation;

        const type = !methodName ? TestType.class : TestType.method;
        const id = this.removeDataset(this.uniqueId({ type: type, classFQN, methodName }));

        return { id, file };
    }

    protected normalizeMethodName(methodName: string) {
        return capitalize(snakeCase(
            methodName.replace(/^test/i, '').replace(/_/g, ' ').trim(),
        )).replace(/_/g, ' ');
    }
}