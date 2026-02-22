import type { TestResultIdentify } from '../TestOutput';
import { type TestDefinition, TestType } from '../types';
import { stripDataset } from '../utils';

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

        if (annotations?.testdox && annotations.testdox.length > 0) {
            return annotations.testdox[annotations.testdox.length - 1];
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
        let dataset = '';
        const matched = methodName?.match(
            /(?<methodName>.*)(?<dataset>\swith\sdata\sset\s[#"].+$)/,
        );
        if (matched?.groups) {
            methodName = matched.groups.methodName;
            dataset = matched.groups.dataset;
        }

        if (annotations?.testdox && annotations.testdox.length > 0) {
            methodName = annotations.testdox[annotations.testdox.length - 1];
        } else {
            methodName = this.normalizeMethodName(methodName ?? '');
        }

        return methodName + dataset;
    }

    protected removeDataset(id: string) {
        return stripDataset(id);
    }
}
