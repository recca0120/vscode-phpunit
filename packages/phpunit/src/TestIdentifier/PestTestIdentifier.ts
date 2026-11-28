import { PestV1Fixer } from '../TestOutput/Fixers/PestV1Fixer';
import { PestV2Fixer } from '../TestOutput/Fixers/PestV2Fixer';
import { type TestDefinition, TestType } from '../types';
import { uncapitalize } from '../utils';
import { isPest } from './isPest';
import { PHPUnitTestIdentifier } from './PHPUnitTestIdentifier';

const isClassName = (name: string) => name.includes('\\') && !/^[A-Za-z]:\\/.test(name);

export class PestTestIdentifier extends PHPUnitTestIdentifier {
    uniqueId(
        testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>,
    ): string {
        const initialClassFQN = testDefinition.classFQN ?? '';
        if (!isPest(initialClassFQN)) {
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

    fromLocationHint(locationHint: string, name: string, root?: string) {
        const matched = locationHint.match(
            /(pest_qn|file):\/\/(?<id>(?<prefix>[\w\s]+)\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/,
        );
        if (!matched) {
            const raw = locationHint.replace(/(pest_qn|file):\/\//, '');
            const sepIdx = raw.indexOf('::');
            const normalized =
                sepIdx === -1
                    ? raw.replace(/\\/g, '/')
                    : raw.slice(0, sepIdx).replace(/\\/g, '/') + raw.slice(sepIdx);
            const location = PestV1Fixer.normalizeLocationHint(normalized, root);
            const id = this.normalizeMethodName(PestV2Fixer.decodeEvaluableId(location, name));
            const file = location.split('::')[0];

            if (id === file && !isClassName(name)) {
                return { id: name, file: '' };
            }

            return { id, file };
        }

        const methodName = this.normalizeMethodName(matched.groups?.method ?? '');
        if (!methodName) {
            return { id: name, file: '' };
        }

        const classFQN = matched.groups?.classFQN;
        const id = this.uniqueId({ type: TestType.method, classFQN, methodName });

        return { id, file: '' };
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\{@\*}/g, '*/');
    }
}
