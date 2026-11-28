import { datasetNaming } from '../../Dataset/DatasetNaming';
import type { TestResultCache } from '../TestResultCache';
import { TeamcityEvent, type TestResult } from '../types';

function toDataSetLabel(locationHint: string) {
    const matched = locationHint.match(/(?<description>.+)\swith\s\('(?<data>.+)'\)/);

    return matched?.groups?.description
        ? `${matched.groups.description} with ${datasetNaming.named(`('${matched.groups.data}')`)}`
        : locationHint;
}

const isAbsolutePath = (path: string) => /^([A-Za-z]:)?\//.test(path);

const relativeToRoot = (path: string, root?: string) => {
    if (!root) {
        return undefined;
    }
    const base = `${root.replace(/\\/g, '/').replace(/\/$/, '')}/`;

    return path.toLowerCase().startsWith(base.toLowerCase()) ? path.slice(base.length) : undefined;
};

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
    normalizeLocationHint(locationHint: string, root?: string) {
        if (!isAbsolutePath(locationHint)) {
            return toDataSetLabel(locationHint);
        }

        return toDataSetLabel(
            relativeToRoot(locationHint, root) ??
                locationHint.substring(locationHint.lastIndexOf('tests/')),
        );
    },

    restoreMissingFlowId(cache: TestResultCache, testResult?: TestResult) {
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
