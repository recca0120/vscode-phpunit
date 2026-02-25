import { TeamcityEvent, type TestResult } from '../TestOutput';
import type { TestResultCache } from '../TestOutput/TestResultCache';
import { datasetNamed } from '../utils';

function fixDataSet(locationHint: string) {
    const matched = locationHint.match(/(?<description>.+)\swith\s\('(?<data>.+)'\)/);

    return matched?.groups?.description
        ? `${matched.groups.description} with ${datasetNamed(`('${matched.groups.data}')`)}`
        : locationHint;
}

type TestResultExt = TestResult & { flowId?: number; name?: string; id?: string };

function matchFlowIdCandidate(tr: TestResultExt, candidate: TestResult): boolean {
    const r = candidate as TestResultExt;
    if (tr.event !== TeamcityEvent.testStarted) {
        return candidate.event === TeamcityEvent.testStarted && r.name === tr.name;
    }

    const matched = tr.id?.match(/\((?<id>.+)\)/);
    return !!matched && r.id === `${matched.groups?.id.replace(/\\/g, '/')}Test`;
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

        const fixableEvents = new Set([
            TeamcityEvent.testStarted,
            TeamcityEvent.testFailed,
            TeamcityEvent.testIgnored,
        ]);
        if ('event' in testResult && !fixableEvents.has(testResult.event)) {
            return testResult;
        }

        const match = cache.findLast((r) => matchFlowIdCandidate(tr, r));
        tr.flowId = (match as (TestResult & { flowId?: number }) | undefined)?.flowId;

        return testResult;
    },
};
