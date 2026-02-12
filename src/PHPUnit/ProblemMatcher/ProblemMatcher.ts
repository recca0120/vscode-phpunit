import {
    TeamcityEvent, TestFailed, TestFinished, TestIgnored, TestResult, TestResultParser, TestStarted, TestSuiteFinished,
    TestSuiteStarted,
} from '.';
import { PestFixer, PestV1Fixer, PHPUnitFixer } from '../Transformer';

export class ProblemMatcher {
    private cache = new Map<string, TestResult>();

    private lookup: { [p: string]: (result: any) => TestResult | undefined } = {
        [TeamcityEvent.testSuiteStarted]: this.handleStarted,
        [TeamcityEvent.testStarted]: this.handleStarted,
        [TeamcityEvent.testFinished]: this.handleFinished,
        [TeamcityEvent.testFailed]: this.handleFault,
        [TeamcityEvent.testIgnored]: this.handleFault,
        [TeamcityEvent.testSuiteFinished]: this.handleFinished,
    };

    constructor(private testResultParser: TestResultParser = new TestResultParser()) { }

    parse(input: string | Buffer): TestResult | undefined {
        let result = this.testResultParser.parse(input.toString());
        result = PestV1Fixer.fixFlowId(this.cache, result);

        if (!this.isDispatchable(result)) {
            return result;
        }

        return this.lookup[result!.event]?.call(this, result);
    }

    private isDispatchable(result?: TestResult): boolean {
        return !!result && 'event' in result && 'name' in result && 'flowId' in result;
    }

    private handleStarted(testResult: TestSuiteStarted | TestStarted) {
        const cacheId = this.cacheId(testResult);
        this.cache.set(cacheId, testResult);

        return this.cache.get(cacheId);
    }

    private handleFault(testResult: TestFailed | TestIgnored): TestResult | undefined {
        const cacheId = this.cacheId(testResult);
        const prevTestResult = this.cache.get(cacheId) as (TestFailed | TestIgnored);

        if (!prevTestResult) {
            return PestFixer.fixNoTestStarted(
                this.cache,
                PHPUnitFixer.fixNoTestStarted(this.cache, testResult),
            );
        }

        if (prevTestResult.event === TeamcityEvent.testStarted) {
            this.cache.set(cacheId, { ...prevTestResult, ...testResult });
            return undefined;
        }

        this.appendFaultDetails(prevTestResult, testResult);
        this.cache.set(cacheId, prevTestResult);

        return undefined;
    }

    private appendFaultDetails(target: TestFailed | TestIgnored, source: TestFailed | TestIgnored) {
        if (source.message) {
            target.message += '\n\n' + source.message;
        }
        target.details.push(...source.details);
    }

    private handleFinished(testResult: TestSuiteFinished | TestFinished) {
        const cacheId = this.cacheId(testResult);

        if (!this.cache.has(cacheId)) {
            return;
        }

        const prevTestResult = this.cache.get(cacheId)!;
        const event = this.isFault(prevTestResult) ? prevTestResult.event : testResult.event;
        const result = { ...prevTestResult, ...testResult, event };
        this.cache.delete(cacheId);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TeamcityEvent.testFailed, TeamcityEvent.testIgnored].includes(testResult.event);
    }

    private cacheId(testResult: TestSuiteStarted | TestStarted | TestFailed | TestIgnored | TestSuiteFinished | TestFinished) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}
