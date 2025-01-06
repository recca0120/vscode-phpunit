import { TestResult } from '../../ProblemMatcher';
import { uncapitalize } from '../../utils';
import { TestDefinition, TestType } from '../types';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';

export class PestTransformer extends PHPUnitTransformer {
    fromLocationHit(locationHint: string, name: string) {
        let file = '';
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            let location = locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/');
            const id = /^tests\//.test(location) ? location : location.substring(location.lastIndexOf('tests/'));
            const testId = id;
            file = id.split('::')[0];

            return { id, testId, file };
        }

        const methodName = matched.groups?.['method'];
        if (!methodName) {
            const id = name;
            const testId = name;

            return { id, testId, file };
        }

        const classFQN = matched.groups?.['classFQN'];
        const type = !methodName ? TestType.class : TestType.method;
        const id = this.uniqueId({ type: type, classFQN, methodName });
        const testId = id;
        // const testId = this.removeDataset(id);

        return { id, testId, file };
    }

    uniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        if (!TransformerFactory.isPest(testDefinition.classFQN!)) {
            return super.uniqueId(testDefinition);
        }

        let { type, classFQN } = testDefinition;
        classFQN = classFQN!.replace(/^P\\/, '');

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [uncapitalize(classFQN).replace(/\\/g, '/') + '.php', this.getMethodName(testDefinition)].join('::');
    };

    static fixPestV1(results = new Map<string, TestResult>(), testResult?: TestResult) {
        if (!testResult) {
            return;
        }

        const events = ['testStarted', 'testFailed', 'testIgnored'];
        if ('event' in testResult && !events.includes(testResult.event)) {
            return testResult;
        }

        if ((testResult as any).flowId) {
            return testResult;
        }

        const result = Array.from(results.values()).reverse().find((result: TestResult) => {
            if (testResult.event !== 'testStarted') {
                return result.event === 'testStarted' && (result as any).name === (testResult as any).name;
            }

            const matched = (testResult as any).id?.match(/\((?<id>.+)\)/);

            return matched && (result as any).id === matched.groups?.id.replace(/\\/g, '/') + 'Test';
        });

        (testResult as any).flowId = (result as any)?.flowId;

        return;
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\*\//g, '{@*}');
    }
}