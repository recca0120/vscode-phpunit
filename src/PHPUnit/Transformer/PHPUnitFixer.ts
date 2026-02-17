import type { TestFailed, TestIgnored } from '../TestOutput';
import type { TestResultCache } from '../TestOutput/TestResultCache';
import { TestIdentifierFactory } from './TestIdentifierFactory';

export const PHPUnitFixer = {
    fixNoTestStarted(cache: TestResultCache, testResult: TestFailed | TestIgnored) {
        if (testResult.id) {
            return testResult;
        }

        const prevTestResult = cache.findByPattern(/^(php_qn):\/\//, testResult);
        if (!prevTestResult) {
            return testResult;
        }

        if (!testResult.locationHint) {
            const parts = prevTestResult.locationHint?.split('::') ?? [];
            const locationHint = parts.slice(0, Math.max(2, parts.length - 1)).join('::');
            testResult.locationHint = [locationHint, testResult.name]
                .filter((value) => !!value)
                .join('::');
        }

        const transformer = TestIdentifierFactory.create(testResult.locationHint);
        const { id, file } = transformer.fromLocationHit(testResult.locationHint, testResult.name);
        testResult.id = id;
        testResult.file = file;

        return testResult;
    },
};
