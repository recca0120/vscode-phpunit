import { TeamcityEvent, TestResult } from '../ProblemMatcher';
import { TestDefinition, TestType } from '../types';
import { capitalize, uncapitalize } from '../utils';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { TransformerFactory } from './TransformerFactory';


export class Str {
    static prefix = '__pest_evaluable_';

    static evaluable(code: string) {
        return this.prefix + code.replace(/_/g, '__').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_');
    }
}

export class PestV1Fixer {
    static fixLocationHint(locationHint: string) {
        return this.fixDataSet(/^tests\//.test(locationHint) ? locationHint : locationHint.substring(locationHint.lastIndexOf('tests/')));
    }

    static fixFlowId(results = new Map<string, TestResult>(), testResult?: TestResult) {
        if (!testResult) {
            return testResult;
        }

        const events = [TeamcityEvent.testStarted, TeamcityEvent.testFailed, TeamcityEvent.testIgnored];
        if ('event' in testResult && !events.includes(testResult.event) || (testResult as any).flowId) {
            return testResult;
        }

        const result = Array.from(results.values()).reverse().find((result: TestResult) => {
            if (testResult.event !== TeamcityEvent.testStarted) {
                return result.event === TeamcityEvent.testStarted && (result as any).name === (testResult as any).name;
            }

            const matched = (testResult as any).id?.match(/\((?<id>.+)\)/);

            return matched && (result as any).id === matched.groups?.id.replace(/\\/g, '/') + 'Test';
        });

        (testResult as any).flowId = (result as any)?.flowId;

        return testResult;
    }

    private static fixDataSet(locationHint: string) {
        const matched = locationHint.match(/(?<description>.+)\swith\s\('(?<data>.+)'\)/);

        return matched && matched.groups?.description
            ? `${matched.groups.description} with data set "(\'${matched.groups.data}\')"`
            : locationHint;
    }
}

export class PestV2Fixer {
    static fixId(location: string, name: string) {
        return this.hasPrefix(name) ? name : location;
    }

    static isEqualsPestV2DataSetId(result: TestResult, testItemId: string) {
        if (!('id' in result) || !this.hasPrefix(result.id)) {
            return false;
        }

        let [classFQN, method] = testItemId.split('::');
        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, this.methodName(method)].join('::') === result.id;
    }

    private static hasPrefix(id?: string) {
        return id && new RegExp(Str.prefix).test(id);
    }

    static methodName(methodName: string) {
        methodName = methodName.replace(/\{@\*}/g, '*/');
        const matched = methodName.match(/(?<method>.*)\swith\sdata\sset\s(?<dataset>.+)/);
        let dataset = '';
        if (matched) {
            methodName = matched.groups!.method;
            dataset = matched.groups!.dataset.replace(/\|'/g, '\'');
        }

        return Str.evaluable(methodName) + dataset;
    }
}

export class PestTransformer extends PHPUnitTransformer {
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

    fromLocationHit(locationHint: string, name: string) {
        const matched = locationHint.match(/(pest_qn|file):\/\/(?<id>(?<prefix>\w+)\s+\((?<classFQN>[\w\\]+)\)(::(?<method>.+))?)/);
        if (!matched) {
            const location = PestV1Fixer.fixLocationHint(locationHint.replace(/(pest_qn|file):\/\//, '').replace(/\\/g, '/'));
            const id = this.removeDataset(this.normalizeMethodName(PestV2Fixer.fixId(location, name)));
            const file = location.split('::')[0];

            return { id, file };
        }

        const methodName = this.normalizeMethodName(matched.groups?.method ?? '');
        if (!methodName) {
            return { id: this.removeDataset(name), file: '' };
        }

        const classFQN = matched.groups?.classFQN;
        const type = !methodName ? TestType.class : TestType.method;
        const id = this.removeDataset(this.uniqueId({ type: type, classFQN, methodName }));

        return { id, file: '' };
    }

    protected normalizeMethodName(methodName: string) {
        return methodName.replace(/\{@\*}/g, '*/');
    }
}