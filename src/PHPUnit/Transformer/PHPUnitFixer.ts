import { TestFailed, TestIgnored, TestResult } from '../ProblemMatcher';
import { TransformerFactory } from './TransformerFactory';
import { getPrevTestResult } from './utils';

export class PHPUnitFixer {
    static fixNoTestStarted(cache: Map<string, TestResult>, testResult: TestFailed | TestIgnored) {
        if (testResult.id) {
            return testResult;
        }

        const prevTestResult = getPrevTestResult(new RegExp('^(php_qn):\/\/'), cache, testResult);
        if (!prevTestResult) {
            return testResult;
        }

        if (!testResult.locationHint) {
            const parts = prevTestResult.locationHint?.split('::') ?? [];
            const locationHint = parts.slice(0, Math.max(2, parts.length - 1)).join('::');
            testResult.locationHint = [locationHint, testResult.name]
                .filter(value => !!value)
                .join('::');
        }

        const transformer = TransformerFactory.factory(testResult.locationHint);
        const { id, file } = transformer.fromLocationHit(testResult.locationHint, testResult.name);
        testResult.id = id;
        testResult.file = file;

        return testResult;
    }
}
