import { type TestDefinition, TestType } from '../types';
import { capitalize, snakeCase, splitFQN, titleCase } from '../utils';
import { TestIdentifier } from './TestIdentifier';

export class PHPUnitTestIdentifier extends TestIdentifier {
    uniqueId(
        testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>,
    ): string {
        const { type } = testDefinition;
        const stripped = testDefinition.classFQN?.replace(/Test$/i, '') ?? '';
        const { namespace, className: rawClassName } = splitFQN(stripped);
        const className = titleCase(rawClassName);
        const classFQN = namespace.length === 0 ? className : `${className} (${stripped})`;

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [classFQN, this.getMethodName({ methodName: testDefinition.methodName })].join('::');
    }

    fromLocationHint(locationHint: string, _name: string) {
        const partsLocation = locationHint
            .replace(/^php_qn:\/\//, '')
            .replace(/::\\/g, '::')
            .split('::');
        const file = partsLocation.shift();
        const [classFQN, methodName] = partsLocation;

        const type = !methodName ? TestType.class : TestType.method;
        const id = this.removeDataset(this.uniqueId({ type: type, classFQN, methodName }));

        return { id, file };
    }

    protected normalizeMethodName(methodName: string) {
        return capitalize(
            snakeCase(methodName.replace(/^test/i, '').replace(/_/g, ' ').trim()),
        ).replace(/_/g, ' ');
    }
}
