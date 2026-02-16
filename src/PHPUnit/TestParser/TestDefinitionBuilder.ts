import { type Transformer, TransformerFactory } from '../Transformer';
import { type TestDefinition, TestType } from '../types';
import type { PhpAstNodeWrapper } from './PhpAstNodeWrapper';

abstract class TestDefinitionBuilder {
    constructor(protected definition: PhpAstNodeWrapper) {}

    abstract build(): TestDefinition;

    protected generate(testDefinition: Partial<TestDefinition>) {
        testDefinition = {
            type: this.definition.type,
            classFQN: this.definition.classFQN,
            children: [],
            annotations: this.definition.annotations,
            file: this.definition.file,
            ...this.definition.position,
            ...testDefinition,
        };
        const transformer = this.getTransformer(testDefinition);
        testDefinition.id = transformer.uniqueId(testDefinition as TestDefinition);
        testDefinition.label = transformer.generateLabel(testDefinition as TestDefinition);

        return testDefinition as TestDefinition;
    }

    private getTransformer(testDefinition: Pick<TestDefinition, 'classFQN'>): Transformer {
        const classFQN = testDefinition.classFQN ?? '';
        return TransformerFactory.create(classFQN);
    }
}

export class NamespaceDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        const type = TestType.namespace;
        const depth = 0;
        const parts = (this.definition.classFQN ?? '').split('\\');

        if (this.definition.kind === 'program') {
            const namespace = parts.slice(0, -1).join('\\');
            return this.generate({ type, depth, namespace, classFQN: namespace });
        }

        if (this.definition.kind === 'class') {
            const className = parts.pop();
            const namespace = parts.join('\\');
            return this.generate({ type, depth, namespace, classFQN: namespace, className });
        }

        const classFQN = this.definition.classFQN;
        return this.generate({ type, depth, namespace: classFQN, classFQN });
    }
}

export class TestSuiteDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        return this.generate({
            namespace: this.definition.parent?.name,
            className: this.definition.name,
            depth: 1,
        });
    }
}

export class TestCaseDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        return this.generate({
            namespace: this.definition.parent?.parent?.name,
            className: this.definition.parent?.name,
            methodName: this.definition.name,
            depth: 2,
        });
    }
}

export class PestTestDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        if (this.definition.kind === 'program') {
            const classFQN = this.definition.classFQN ?? '';
            const partsFQN = classFQN.split('\\');
            const className = partsFQN.pop() ?? '';

            return this.generate({ namespace: partsFQN.join('\\'), className, depth: 1 });
        }

        let { methodName, label } = this.parseMethodNameAndLabel();

        if (this.definition.type === TestType.describe) {
            methodName = `\`${methodName}\``;
        }

        const { ancestor, describeNames } = this.collectDescribeChain();
        const depth = 2 + describeNames.length;

        if (describeNames.length > 0) {
            methodName = describeNames.reverse().concat(methodName).join(' → ');
        }

        const { classFQN, namespace, className } = ancestor?.toTestDefinition() ?? {};

        return this.generate({ classFQN, namespace, className, methodName, label, depth });
    }

    private collectDescribeChain(): {
        ancestor: PhpAstNodeWrapper | undefined;
        describeNames: string[];
    } {
        let parent = this.definition.parent;
        while (parent && parent.kind === 'call' && parent.type !== TestType.describe) {
            parent = parent.parent;
        }

        const describeNames: string[] = [];
        while (parent?.type === TestType.describe) {
            describeNames.push(`\`${parent.arguments[0].name}\``);
            parent = parent.parent;
        }

        return { ancestor: parent, describeNames };
    }

    private parseMethodNameAndLabel() {
        const args = this.definition.arguments;

        if (this.definition.name !== 'arch') {
            let methodName = args[0].name;

            if (this.definition.name === 'it') {
                methodName = `it ${methodName}`;
            }

            return { methodName, label: methodName };
        }

        if (args.length > 0) {
            const methodName = args[0].name;

            return { methodName, label: methodName };
        }

        const names = [] as string[];
        let parent = this.definition.parent;
        while (parent && parent.kind === 'call') {
            names.push(parent.name);
            parent = parent.parent;
        }

        const methodName = names
            .map((name: string) => (name === 'preset' ? `${name}  ` : ` ${name} `))
            .join('→');

        const label = names.join(' → ');

        return { methodName, label };
    }
}
