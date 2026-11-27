import type { TestResultCache } from '../TestResultCache';
import type { TestFailed, TestIgnored } from '../types';

export const PestFixer = {
    assignIdWithoutTestStarted(cache: TestResultCache, testResult: TestFailed | TestIgnored) {
        if (testResult.id) {
            return testResult;
        }

        if (!testResult.duration) {
            testResult.duration = 0;
        }

        return (
            idFromFirstDetail(testResult) ?? idFromPreviousResult(cache, testResult) ?? testResult
        );
    },
};

function idFromFirstDetail(
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

function idFromPreviousResult(
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
