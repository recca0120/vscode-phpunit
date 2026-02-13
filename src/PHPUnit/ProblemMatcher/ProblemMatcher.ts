import {
    TeamcityEvent, TestFailed, TestFinished, TestIgnored, TestResult, TestResultParser, TestStarted, TestSuiteFinished,
    TestSuiteStarted,
} from '.';
import { PestFixer, PestV1Fixer, PHPUnitFixer } from '../Transformer';

export class ProblemMatcher {
    private cache = new Map<string, TestResult>();

    constructor(private testResultParser: TestResultParser = new TestResultParser()) { }

    parse(input: string | Buffer): TestResult | undefined {
        let result = this.testResultParser.parse(input.toString());
        result = PestV1Fixer.fixFlowId(this.cache, result);

        if (!this.isDispatchable(result)) {
            return result;
        }

        return this.dispatch(result!);
    }

    private isDispatchable(result?: TestResult): boolean {
        return !!result && 'event' in result && 'name' in result && 'flowId' in result;
    }

    private dispatch(result: TestResult): TestResult | undefined {
        switch (result.event) {
            case TeamcityEvent.testSuiteStarted:
            case TeamcityEvent.testStarted:
                return this.handleStarted(result as TestSuiteStarted | TestStarted);
            case TeamcityEvent.testFailed:
            case TeamcityEvent.testIgnored:
                return this.handleFault(result as TestFailed | TestIgnored);
            case TeamcityEvent.testSuiteFinished:
            case TeamcityEvent.testFinished:
                return this.handleFinished(result as TestSuiteFinished | TestFinished);
            default:
                return undefined;
        }
    }

    private handleStarted(testResult: TestSuiteStarted | TestStarted) {
        const buildCacheKey = this.buildCacheKey(testResult);
        this.cache.set(buildCacheKey, testResult);

        return this.cache.get(buildCacheKey);
    }

    private handleFault(testResult: TestFailed | TestIgnored): TestResult | undefined {
        const buildCacheKey = this.buildCacheKey(testResult);
        const prevTestResult = this.cache.get(buildCacheKey) as (TestFailed | TestIgnored);

        if (!prevTestResult) {
            return PestFixer.fixNoTestStarted(
                this.cache,
                PHPUnitFixer.fixNoTestStarted(this.cache, testResult),
            );
        }

        if (prevTestResult.event === TeamcityEvent.testStarted) {
            this.cache.set(buildCacheKey, { ...prevTestResult, ...testResult });
            return undefined;
        }

        this.mergeFaultDetails(prevTestResult, testResult);
        this.cache.set(buildCacheKey, prevTestResult);

        return undefined;
    }

    private mergeFaultDetails(target: TestFailed | TestIgnored, source: TestFailed | TestIgnored) {
        if (source.message) {
            target.message += '\n\n' + source.message;
        }
        target.details.push(...source.details);
    }

    private handleFinished(testResult: TestSuiteFinished | TestFinished) {
        const buildCacheKey = this.buildCacheKey(testResult);

        if (!this.cache.has(buildCacheKey)) {
            return;
        }

        const prevTestResult = this.cache.get(buildCacheKey)!;
        const event = this.isFault(prevTestResult) ? prevTestResult.event : testResult.event;
        const result = { ...prevTestResult, ...testResult, event };
        this.cache.delete(buildCacheKey);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TeamcityEvent.testFailed, TeamcityEvent.testIgnored].includes(testResult.event);
    }

    private buildCacheKey(testResult: TestSuiteStarted | TestStarted | TestFailed | TestIgnored | TestSuiteFinished | TestFinished) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}
