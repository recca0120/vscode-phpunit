import {
    TeamcityEvent, TestFailed, TestFinished, TestIgnored, TestResult, TestResultParser, TestStarted, TestSuiteFinished,
    TestSuiteStarted,
} from '.';
import { PestV1Fixer } from '../Transformer';

export class ProblemMatcher {
    private results = new Map<string, TestResult>();

    private lookup: { [p: string]: (result: any) => TestResult | undefined } = {
        [TeamcityEvent.testSuiteStarted]: this.handleStarted,
        [TeamcityEvent.testStarted]: this.handleStarted,
        [TeamcityEvent.testFinished]: this.handleFinished,
        [TeamcityEvent.testFailed]: this.handleFault,
        [TeamcityEvent.testIgnored]: this.handleFault,
        [TeamcityEvent.testSuiteFinished]: this.handleFinished,
    };

    constructor(private testResultParser: TestResultParser = new TestResultParser()) {}

    parse(input: string | Buffer): TestResult | undefined {
        const result = this.testResultParser.parse(input.toString());
        PestV1Fixer.fixFlowId(this.results, result);

        return this.isResult(result) ? this.lookup[result!.event]?.call(this, result) : result;
    }

    private isResult(result?: TestResult): boolean {
        return !!result && 'event' in result && 'name' in result && 'flowId' in result;
    }

    private handleStarted(testResult: TestSuiteStarted | TestStarted) {
        const id = this.generateId(testResult);
        this.results.set(id, { ...testResult });

        return this.results.get(id);
    }

    private handleFault(testResult: TestFailed | TestIgnored): undefined {
        const id = this.generateId(testResult);
        const prevData = this.results.get(id) as (TestFailed | TestIgnored);

        if (!prevData || prevData.event === TeamcityEvent.testStarted) {
            this.results.set(id, { ...(prevData ?? {}), ...testResult });
            return;
        }

        if (testResult.message) {
            prevData.message += '\n\n' + testResult.message;
        }
        prevData.details.push(...testResult.details);

        this.results.set(id, prevData);
    }

    private handleFinished(testResult: TestSuiteFinished | TestFinished) {
        const id = this.generateId(testResult);

        const prevData = this.results.get(id)!;
        const event = this.isFault(prevData) ? prevData.event : testResult.event;
        const result = { ...prevData, ...testResult, event };
        this.results.delete(id);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TeamcityEvent.testFailed, TeamcityEvent.testIgnored].includes(testResult.event);
    }

    private generateId(testResult: TestSuiteStarted | TestStarted | TestFailed | TestIgnored | TestSuiteFinished | TestFinished) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}
