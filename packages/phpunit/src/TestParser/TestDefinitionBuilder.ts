import { type TestDefinition, TestType } from '../types';
import { normalizePestLabel, splitDataset } from '../utils';

export function resolveDatasetDefinition(
    name: string,
    parent: TestDefinition,
): TestDefinition | undefined {
    const { dataset, label } = splitDataset(name);
    if (!label) {
        return undefined;
    }

    return createDatasetDefinition(parent, label, dataset);
}

export function createDatasetDefinition(
    parent: TestDefinition,
    label: string,
    dataset?: string,
): TestDefinition {
    return {
        type: TestType.dataset,
        id: `${parent.id}${dataset ?? ` with ${label}`}`,
        label: `with ${normalizePestLabel(label)}`,
        classFQN: parent.classFQN,
        namespace: parent.namespace,
        className: parent.className,
        methodName: parent.methodName,
        file: parent.file,
        start: parent.start,
        end: parent.end,
    };
}
