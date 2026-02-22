import { type TestDefinition, TestType } from '../types';
import { splitDataset } from '../utils';

export function resolveDatasetDefinition(
    name: string,
    parent: TestDefinition,
): TestDefinition | undefined {
    const { label } = splitDataset(name);
    if (!label) {
        return undefined;
    }

    return createDatasetDefinition(parent, label);
}

export function createDatasetDefinition(parent: TestDefinition, label: string): TestDefinition {
    return {
        type: TestType.dataset,
        id: `${parent.id} with data set ${label}`,
        label: `with data set ${label}`,
        classFQN: parent.classFQN,
        namespace: parent.namespace,
        className: parent.className,
        methodName: parent.methodName,
        file: parent.file,
        start: parent.start,
        end: parent.end,
    };
}
