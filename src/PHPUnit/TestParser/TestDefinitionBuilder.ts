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
        return TransformerFactory.create(testDefinition.classFQN!);
    }
}

export class NamespaceDefinitionBuilder extends TestDefinitionBuilder {
    build() {
        const type = TestType.namespace;
        const depth = 0;

        const classFQN = this.definition.classFQN;
        if (this.definition.kind === 'program') {
            const partsFQN = classFQN!.split('\\');
            const namespace = partsFQN.slice(0, -1).join('\\');

            return this.generate({ type, depth, namespace, classFQN: namespace });
        }

        if (this.definition.kind === 'class') {
            const partsFQN = classFQN!.split('\\');
            const className = partsFQN.pop()!;
            const namespace = partsFQN.join('\\');

            return this.generate({ type, depth, namespace, classFQN: namespace, className });
        }

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
            const classFQN = this.definition.classFQN!;
            const partsFQN = classFQN.split('\\');
            const className = partsFQN.pop()!;

            return this.generate({ namespace: partsFQN.join('\\'), className, depth: 1 });
        }

        let depth = 2;

        let { methodName, label } = this.parseMethodNameAndLabel();

        if (this.definition.type === TestType.describe) {
            methodName = `\`${methodName}\``;
        }

        let parent = this.definition.parent;
        while (parent && parent.kind === 'call' && parent.type !== TestType.describe) {
            parent = parent.parent;
        }

        if (parent?.type === TestType.describe) {
            const describeNames: string[] = [];
            while (parent && parent.type === TestType.describe) {
                describeNames.push(`\`${parent.arguments[0].name}\``);
                parent = parent.parent;
                depth++;
            }
            methodName = describeNames.reverse().concat(methodName).join(' → ');
        }

        const { classFQN, namespace, className } = parent?.toTestDefinition();

        return this.generate({ classFQN, namespace, className, methodName, label, depth });
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
