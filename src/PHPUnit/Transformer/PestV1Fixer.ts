import { TeamcityEvent, type TestResult } from '../TestOutput';
import type { TestResultCache } from '../TestOutput/TestResultCache';

function fixDataSet(locationHint: string) {
    const matched = locationHint.match(/(?<description>.+)\swith\s\('(?<data>.+)'\)/);

    return matched?.groups?.description
        ? `${matched.groups.description} with data set "('${matched.groups.data}')"`
        : locationHint;
}

export const PestV1Fixer = {
    fixLocationHint(locationHint: string) {
        return fixDataSet(
            /^tests\//.test(locationHint)
                ? locationHint
                : locationHint.substring(locationHint.lastIndexOf('tests/')),
        );
    },

    fixFlowId(cache: TestResultCache, testResult?: TestResult) {
        if (!testResult) {
            return testResult;
        }

        const tr = testResult as TestResult & { flowId?: number; name?: string; id?: string };
        if (tr.flowId) {
            return testResult;
        }

        if (
            'event' in testResult &&
            testResult.event !== TeamcityEvent.testStarted &&
            testResult.event !== TeamcityEvent.testFailed &&
            testResult.event !== TeamcityEvent.testIgnored
        ) {
            return testResult;
        }

        const result = cache.findLast((result: TestResult) => {
            const r = result as TestResult & { name?: string; id?: string };
            if (testResult.event !== TeamcityEvent.testStarted) {
                return result.event === TeamcityEvent.testStarted && r.name === tr.name;
            }

            const matched = tr.id?.match(/\((?<id>.+)\)/);

            return !!matched && r.id === `${matched.groups?.id.replace(/\\/g, '/')}Test`;
        });

        tr.flowId = (result as (TestResult & { flowId?: number }) | undefined)?.flowId;

        return testResult;
    },
};
