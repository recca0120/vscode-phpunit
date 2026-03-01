import type { TestResultIdentify } from '../TestOutput';
import { datasetExpander } from '../TestParser/DatasetExpander';
import { type TestDefinition, TestType } from '../types';

function lastTestdox(annotations?: Record<string, unknown>): string | undefined {
    const testdox = annotations?.testdox as string[] | undefined;
    return testdox && testdox.length > 0 ? testdox[testdox.length - 1] : undefined;
}

export abstract class TestIdentifier {
    static generateSearchText(input: string) {
        return input.replace(/([[\]()*+$!\\])/g, '\\$1').replace(/@/g, '[\\W]');
    }

    generateLabel(
        testDefinition: Pick<
            TestDefinition,
            'type' | 'classFQN' | 'className' | 'methodName' | 'annotations'
        > & {
            label?: string;
        },
    ): string {
        const { type, classFQN, className, methodName, annotations, label } = testDefinition;

        const testdox = lastTestdox(annotations);
        if (testdox) {
            return testdox;
        }

        if (label) {
            return label;
        }

        if (type === TestType.namespace) {
            return classFQN?.replace(/^P\\/g, '') ?? '';
        }

        if (type === TestType.class) {
            return className ?? classFQN?.replace(/^P\\/g, '') ?? '';
        }

        return methodName?.replace(/`/g, '') ?? '';
    }

    abstract uniqueId(
        testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>,
    ): string;

    abstract fromLocationHint(locationHint: string, name: string): TestResultIdentify;

    protected abstract normalizeMethodName(methodName: string): string;

    protected getMethodName(testDefinition: Pick<TestDefinition, 'methodName' | 'annotations'>) {
        let { methodName, annotations } = testDefinition;
        const { parentId, dataset } = datasetExpander.parse(methodName ?? '');
        if (dataset) {
            methodName = parentId;
        }

        const testdox = lastTestdox(annotations);
        if (testdox) {
            methodName = testdox;
        } else {
            methodName = this.normalizeMethodName(methodName ?? '');
        }

        return methodName + dataset;
    }
}
