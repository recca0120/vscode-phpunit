import type { TestFailed, TestIgnored, TestResult } from '../ProblemMatcher';
import { getPrevTestResult } from './utils';

export { PestV1Fixer } from './PestV1Fixer';
export { PestV2Fixer } from './PestV2Fixer';

export const PestFixer = {
    fixNoTestStarted(cache: Map<string, TestResult>, testResult: TestFailed | TestIgnored) {
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
    },
};
