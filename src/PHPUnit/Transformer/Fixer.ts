import { TeamcityEvent, TestResult, TestStarted, TestSuiteStarted } from '../ProblemMatcher';
import { capitalize } from '../utils';

export class PHPUnitFixer {
    static fixDetails(results = new Map<string, TestResult>(), testResult: TestResult & {
        name: string,
        locationHint?: string,
        file?: string,
        details?: Array<{ file: string, line: number }>,
    }) {
        if (testResult.details && testResult.file) {
            return testResult;
        }

        const result = Array.from(results.values()).reverse().find((result) => {
            return [TeamcityEvent.testSuiteStarted, TeamcityEvent.testStarted].includes(result.event);
        }) as (TestSuiteStarted | TestStarted | undefined);

        if (!result) {
            return testResult;
        }

        const file = result.file!;
        if (!testResult.file) {
            testResult.file = file;
        }

        if (!testResult.details) {
            testResult.details = [{ file: file, line: 1 }];
        }

        if (!testResult.locationHint) {
            const locationHint = result.locationHint?.split('::').slice(0, 2).join('::');
            testResult.locationHint = [locationHint, testResult.name]
                .filter(value => !!value)
                .join('::');
        }

        return testResult;
    }
}

class Str {
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