import { type TestDefinition, TestType } from '../types';

function parseDatasetLabel(name: string): string | undefined {
    const match = name.match(/\swith\sdata\sset\s([#"].+)$/);

    return match?.[1];
}

export function resolveDatasetDefinition(
    name: string,
    parent: TestDefinition,
): TestDefinition | undefined {
    const label = parseDatasetLabel(name);
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
