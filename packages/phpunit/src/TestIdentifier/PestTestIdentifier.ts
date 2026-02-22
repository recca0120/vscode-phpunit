import { type TestDefinition, TestType } from '../types';
import { stripDataset, uncapitalize } from '../utils';
import { PestV1Fixer, PestV2Fixer } from './PestFixer';
import { PHPUnitTestIdentifier } from './PHPUnitTestIdentifier';
import { TestIdentifierFactory } from './TestIdentifierFactory';

export class PestTestIdentifier extends PHPUnitTestIdentifier {
    uniqueId(
        testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>,
    ): string {
        const initialClassFQN = testDefinition.classFQN ?? '';
        if (!TestIdentifierFactory.isPest(initialClassFQN)) {
            return super.uniqueId(testDefinition);
        }

        const { type } = testDefinition;
        const classFQN = testDefinition.classFQN?.replace(/^P\\/, '') ?? '';

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [
            `${uncapitalize(classFQN).replace(/\\/g, '/')}.php`,
            this.getMethodName(testDefinition),
        ].join('::');
    }

    fromLocationHint(locationHint: string, name: string) {
        const matched = locationHint.match(
            /(pest_qn|file):\/\/(?<id>(?<prefix>[\w\s]+)\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/,
        );
        if (!matched) {
            const location = PestV1Fixer.fixLocationHint(
                locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/'),
            );
            const id = stripDataset(this.normalizeMethodName(PestV2Fixer.fixId(location, name)));
            const file = location.split('::')[0];

            return { id, file };
        }

        const methodName = this.normalizeMethodName(matched.groups?.method ?? '');
        if (!methodName) {
            return { id: stripDataset(name), file: '' };
        }

        const classFQN = matched.groups?.classFQN;
        const id = stripDataset(this.uniqueId({ type: TestType.method, classFQN, methodName }));

        return { id, file: '' };
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\{@\*}/g, '*/');
    }
}
