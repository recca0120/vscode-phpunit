import { PestFixer, PestV1Fixer } from '../TestIdentifier/PestFixer';
import { PHPUnitFixer } from '../TestIdentifier/PHPUnitFixer';
import {
    TeamcityEvent,
    type TestFailed,
    type TestFinished,
    type TestIgnored,
    type TestResult,
    type TestStarted,
    type TestSuiteFinished,
    type TestSuiteStarted,
} from '.';
import { TeamcityLineParser } from './TeamcityLineParser';
import { TestResultCache } from './TestResultCache';

export class TestOutputParser {
    private cache = new TestResultCache();

    constructor(private testResultParser: TeamcityLineParser = new TeamcityLineParser()) {}

    parse(input: string | Buffer): TestResult | undefined {
        let result = this.testResultParser.parse(input.toString());
        result = PestV1Fixer.fixFlowId(this.cache, result);

        if (!this.isDispatchable(result)) {
            return result;
        }

        return this.dispatch(result);
    }

    private isDispatchable(result?: TestResult): result is TestResult {
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

        return testResult;
    }

    private handleFault(testResult: TestFailed | TestIgnored): TestResult | undefined {
        const prevTestResult = this.cache.get(testResult);

        if (!prevTestResult) {
            return PestFixer.fixNoTestStarted(
                this.cache,
                PHPUnitFixer.fixNoTestStarted(this.cache, testResult),
            );
        }

        if (prevTestResult.event === TeamcityEvent.testStarted) {
            this.cache.set(testResult, { ...prevTestResult, ...testResult });
            return undefined;
        }

        this.mergeFaultDetails(prevTestResult as TestFailed | TestIgnored, testResult);
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
        const prevTestResult = this.cache.get(testResult);
        if (!prevTestResult) {
            return;
        }

        const event = this.isFault(prevTestResult) ? prevTestResult.event : testResult.event;
        const result = { ...prevTestResult, ...testResult, event };
        this.cache.delete(testResult);

        return result;
    }

    private isFault(testResult: TestResult) {
        return (
            testResult.event === TeamcityEvent.testFailed ||
            testResult.event === TeamcityEvent.testIgnored
        );
    }
}
