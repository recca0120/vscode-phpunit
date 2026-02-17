import { TestIdentifierFactory } from '../Transformer';
import { type TestDefinition, TestType } from '../types';
import type { TestNode } from './TestNode';

function buildTestDefinition(
    definition: TestNode,
    overrides: Partial<TestDefinition>,
): TestDefinition {
    const type = overrides.type ?? definition.type ?? TestType.class;
    const base = {
        classFQN: definition.classFQN,
        children: [] as TestDefinition[],
        annotations: definition.annotations,
        file: definition.file,
        ...definition.position,
        ...overrides,
        type,
    };

    const classFQN = base.classFQN ?? '';
    const transformer = TestIdentifierFactory.create(classFQN);

    return {
        ...base,
        id: transformer.uniqueId(base),
        label: transformer.generateLabel(base),
    };
}

export function buildNamespaceDefinition(definition: TestNode): TestDefinition {
    const type = TestType.namespace;
    const parts = (definition.classFQN ?? '').split('\\');

    if (definition.kind === 'program') {
        const namespace = parts.slice(0, -1).join('\\');
        return buildTestDefinition(definition, { type, namespace, classFQN: namespace });
    }

    if (definition.kind === 'class_declaration') {
        const className = parts.pop();
        const namespace = parts.join('\\');
        return buildTestDefinition(definition, {
            type,
            namespace,
            classFQN: namespace,
            className,
        });
    }

    const classFQN = definition.classFQN;
    return buildTestDefinition(definition, { type, namespace: classFQN, classFQN });
}

export function buildTestSuiteDefinition(definition: TestNode): TestDefinition {
    return buildTestDefinition(definition, {
        namespace: definition.parent?.name,
        className: definition.name,
    });
}

export function buildTestCaseDefinition(definition: TestNode): TestDefinition {
    return buildTestDefinition(definition, {
        namespace: definition.parent?.parent?.name,
        className: definition.parent?.name,
        methodName: definition.name,
    });
}

export function buildPestTestDefinition(definition: TestNode): TestDefinition {
    if (definition.kind === 'program') {
        const classFQN = definition.classFQN ?? '';
        const partsFQN = classFQN.split('\\');
        const className = partsFQN.pop() ?? '';

        return buildTestDefinition(definition, {
            namespace: partsFQN.join('\\'),
            className,
        });
    }

    let { methodName, label } = parseMethodNameAndLabel(definition);

    if (definition.type === TestType.describe) {
        methodName = `\`${methodName}\``;
    }

    const { ancestor, describeNames } = collectDescribeChain(definition);
    if (describeNames.length > 0) {
        methodName = describeNames.reverse().concat(methodName).join(' → ');
    }

    const { classFQN, namespace, className } = ancestor?.toTestDefinition() ?? {};

    return buildTestDefinition(definition, {
        classFQN,
        namespace,
        className,
        methodName,
        label,
    });
}

function collectDescribeChain(definition: TestNode): {
    ancestor: TestNode | undefined;
    describeNames: string[];
} {
    let parent = definition.parent;
    while (
        parent &&
        parent.kind === 'function_call_expression' &&
        parent.type !== TestType.describe
    ) {
        parent = parent.parent;
    }

    const describeNames: string[] = [];
    while (parent?.type === TestType.describe) {
        describeNames.push(`\`${parent.arguments[0].name}\``);
        parent = parent.parent;
    }

    return { ancestor: parent, describeNames };
}

function parseMethodNameAndLabel(definition: TestNode) {
    const args = definition.arguments;

    if (args.length > 0) {
        const methodName = definition.name === 'it' ? `it ${args[0].name}` : args[0].name;

        return { methodName, label: methodName };
    }

    const names = [] as string[];
    let parent = definition.parent;
    while (parent && parent.kind === 'function_call_expression') {
        names.push(parent.name);
        parent = parent.parent;
    }

    const methodName = names
        .map((name: string) => (name === 'preset' ? `${name}  ` : ` ${name} `))
        .join('→');

    const label = names.join(' → ');

    return { methodName, label };
}
