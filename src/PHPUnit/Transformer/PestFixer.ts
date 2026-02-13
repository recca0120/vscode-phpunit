import {
    TeamcityEvent,
    type TestFailed,
    type TestIgnored,
    type TestResult,
} from '../ProblemMatcher';
import { capitalize } from '../utils';
import { getPrevTestResult } from './utils';

class Str {
    static prefix = '__pest_evaluable_';

    static evaluable(code: string) {
        return (
            Str.prefix +
            code
                .replace(/_/g, '__')
                .replace(/\s/g, '_')
                .replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_')
        );
    }
}

export class PestFixer {
    static fixNoTestStarted(cache: Map<string, TestResult>, testResult: TestFailed | TestIgnored) {
        if (testResult.id) {
            return testResult;
        }

        if (!testResult.duration) {
            testResult.duration = 0;
        }

        if ('details' in testResult && testResult.details.length > 0) {
            const file = testResult.details[0].file;
            testResult.id = [file, testResult.name].join('::');
            testResult.file = file;

            return testResult;
        }

        const pattern = /^(pest_qn|file):\/\//;
        const prevTestResult = getPrevTestResult(pattern, cache, testResult);
        if (prevTestResult) {
            testResult.id = [prevTestResult.locationHint?.replace(pattern, ''), testResult.name]
                .filter((v) => !!v)
                .join('::');

            return testResult;
        }

        return testResult;
    }
}

export class PestV1Fixer {
    static fixLocationHint(locationHint: string) {
        return PestV1Fixer.fixDataSet(
            /^tests\//.test(locationHint)
                ? locationHint
                : locationHint.substring(locationHint.lastIndexOf('tests/')),
        );
    }

    static fixFlowId(cache: Map<string, TestResult>, testResult?: TestResult) {
        if (!testResult) {
            return testResult;
        }

        const events = [
            TeamcityEvent.testStarted,
            TeamcityEvent.testFailed,
            TeamcityEvent.testIgnored,
        ];
        const tr = testResult as TestResult & { flowId?: number; name?: string; id?: string };
        if (('event' in testResult && !events.includes(testResult.event)) || tr.flowId) {
            return testResult;
        }

        const result = Array.from(cache.values())
            .reverse()
            .find((result: TestResult) => {
                const r = result as TestResult & { name?: string; id?: string };
                if (testResult.event !== TeamcityEvent.testStarted) {
                    return result.event === TeamcityEvent.testStarted && r.name === tr.name;
                }

                const matched = tr.id?.match(/\((?<id>.+)\)/);

                return matched && r.id === `${matched.groups?.id.replace(/\\/g, '/')}Test`;
            });

        tr.flowId = (result as (TestResult & { flowId?: number }) | undefined)?.flowId;

        return testResult;
    }

    private static fixDataSet(locationHint: string) {
        const matched = locationHint.match(/(?<description>.+)\swith\s\('(?<data>.+)'\)/);

        return matched?.groups?.description
            ? `${matched.groups.description} with data set "('${matched.groups.data}')"`
            : locationHint;
    }
}

export class PestV2Fixer {
    static fixId(location: string, name: string) {
        return PestV2Fixer.hasPrefix(name) ? name : location;
    }

    static isEqualsPestV2DataSetId(result: TestResult, testItemId: string) {
        if (!('id' in result) || !PestV2Fixer.hasPrefix(result.id)) {
            return false;
        }

        let [classFQN, method] = testItemId.split('::');
        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, PestV2Fixer.methodName(method)].join('::') === result.id;
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
            dataset = matched.groups!.dataset.replace(/\|'/g, "'");
        }

        return Str.evaluable(methodName) + dataset;
    }
}
