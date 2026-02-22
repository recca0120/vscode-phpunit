import type { TestFailed, TestIgnored } from '../TestOutput';
import type { TestResultCache } from '../TestOutput/TestResultCache';

export { PestV1Fixer } from './PestV1Fixer';
export { PestV2Fixer } from './PestV2Fixer';

export const PestFixer = {
    fixNoTestStarted(cache: TestResultCache, testResult: TestFailed | TestIgnored) {
        if (testResult.id) {
            return testResult;
        }

        if (!testResult.duration) {
            testResult.duration = 0;
        }

        return fixFromDetails(testResult) ?? fixFromCache(cache, testResult) ?? testResult;
    },
};

function fixFromDetails(
    testResult: TestFailed | TestIgnored,
): (TestFailed | TestIgnored) | undefined {
    if (!('details' in testResult) || testResult.details.length === 0) {
        return undefined;
    }

    const file = testResult.details[0].file;
    testResult.id = [file, testResult.name].join('::');
    testResult.file = file;

    return testResult;
}

function fixFromCache(
    cache: TestResultCache,
    testResult: TestFailed | TestIgnored,
): (TestFailed | TestIgnored) | undefined {
    const pattern = /^(pest_qn|file):\/\//;
    const prevTestResult = cache.findByPattern(pattern, testResult);
    if (!prevTestResult) {
        return undefined;
    }

    testResult.id = [prevTestResult.locationHint?.replace(pattern, ''), testResult.name]
        .filter((v) => !!v)
        .join('::');

    return testResult;
}
