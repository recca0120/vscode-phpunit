import { PestFixer, PestV1Fixer, PHPUnitFixer } from '../Transformer';
import {
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestResult,
    TestResultParser,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
} from '.';
import { TestResultCache } from './TestResultCache';

export class ProblemMatcher {
    private cache = new TestResultCache();

    constructor(private testResultParser: TestResultParser = new TestResultParser()) {}

    parse(input: string | Buffer): TestResult | undefined {
        let result = this.testResultParser.parse(input.toString());
        result = PestV1Fixer.fixFlowId(this.cache.asMap(), result);

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
        this.cache.set(testResult, testResult);

        return this.cache.get(testResult);
    }

    private handleFault(testResult: TestFailed | TestIgnored): TestResult | undefined {
        const prevTestResult = this.cache.get(testResult) as TestFailed | TestIgnored;

        if (!prevTestResult) {
            return PestFixer.fixNoTestStarted(
                this.cache.asMap(),
                PHPUnitFixer.fixNoTestStarted(this.cache.asMap(), testResult),
            );
        }

        if (prevTestResult.event === TeamcityEvent.testStarted) {
            this.cache.set(testResult, { ...prevTestResult, ...testResult });
            return undefined;
        }

        this.mergeFaultDetails(prevTestResult, testResult);
        this.cache.set(testResult, prevTestResult);

        return undefined;
    }

    private mergeFaultDetails(target: TestFailed | TestIgnored, source: TestFailed | TestIgnored) {
        if (source.message) {
            target.message += `\n\n${source.message}`;
        }
        target.details.push(...source.details);
    }

    private handleFinished(testResult: TestSuiteFinished | TestFinished) {
        if (!this.cache.has(testResult)) {
            return;
        }

        const prevTestResult = this.cache.get(testResult)!;
        const event = this.isFault(prevTestResult) ? prevTestResult.event : testResult.event;
        const result = { ...prevTestResult, ...testResult, event };
        this.cache.delete(testResult);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TeamcityEvent.testFailed, TeamcityEvent.testIgnored].includes(testResult.event);
    }
}
