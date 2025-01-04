import {
    TestFailed, TestFinished, TestIgnored, TestResult, TestResultEvent, TestResultParser, TestStarted,
    TestSuiteFinished, TestSuiteStarted,
} from '.';

export class ProblemMatcher {
    private results = new Map<string, TestResult>();
    private flowIdMap = new Map<string, { flowId: number, timestamp: number }>();
    private flowIdMapTimeOutMilliSeconds = 60 * 1000;

    private lookup: { [p: string]: (result: any) => TestResult | undefined } = {
        [TestResultEvent.testSuiteStarted]: this.handleStarted,
        [TestResultEvent.testStarted]: this.handleStarted,
        [TestResultEvent.testFinished]: this.handleFinished,
        [TestResultEvent.testFailed]: this.handleFault,
        [TestResultEvent.testIgnored]: this.handleFault,
        [TestResultEvent.testSuiteFinished]: this.handleFinished,
    };

    constructor(private testResultParser: TestResultParser = new TestResultParser()) { }

    parse(input: string | Buffer): TestResult | undefined {
        let result = this.testResultParser.parse(input.toString());

        if (result && this.isMissingFlowIdInStartedResult(result)) {
            const flowId = this.findFlowId(result);
            result = { ...result, flowId } as TestResult;
        }

        return this.isResult(result) ? this.lookup[result!.event]?.call(this, result) : result;
    }

    private isMissingFlowIdInStartedResult(result: TestResult): result is TestStarted {
        return result.event === TestResultEvent.testStarted
            && !('flowId' in result);
    }

    private isResult(result?: TestResult): boolean {
        return !!(result && 'event' in result && 'name' in result && 'flowId' in result);
    }

    private generateFlowIdMapKey(testResult: TestSuiteStarted | TestStarted): string {
        const locationHint = testResult.locationHint || '';
        const filepath = locationHint.split('://')[1]?.split(':')[0] || '';
        return filepath;
    }

    private findFlowId(testResult: TestStarted): number {
        let key = this.generateFlowIdMapKey(testResult);
        let entry = this.flowIdMap.get(key);
        let flowId = entry?.flowId ?? 0;

        if (flowId === 0) {
            key = testResult.locationHint.split('::')[1]?.replace(/^\\/, "") || '';
            entry = this.flowIdMap.get(key);
            flowId = entry?.flowId ?? 0;
        }

        return flowId;
    }

    private cleanupOldFlowIdMap() {
        const now = Date.now();
        for (const [key, value] of this.flowIdMap.entries()) {
            if (now - value.timestamp > this.flowIdMapTimeOutMilliSeconds) {
                this.flowIdMap.delete(key);
            }
        }
    }

    private saveSuiteStartedFlowId(testResult: TestSuiteStarted) {
        const key = this.generateFlowIdMapKey(testResult);
        this.flowIdMap.set(key, { flowId: testResult.flowId, timestamp: Date.now() });
    }

    private isSuiteStartedResult(testResult: TestSuiteStarted | TestStarted): testResult is TestSuiteStarted {
        return testResult.event === TestResultEvent.testSuiteStarted;
    }

    private handleStarted(testResult: TestSuiteStarted | TestStarted) {
        if (this.isSuiteStartedResult(testResult) && testResult.flowId) {
            this.saveSuiteStartedFlowId(testResult);
        }

        const id = this.generateId(testResult);
        this.results.set(id, { ...testResult });

        return this.results.get(id);
    }

    private handleFault(testResult: TestFailed | TestIgnored): undefined {
        this.cleanupOldFlowIdMap();
        const id = this.generateId(testResult);
        const prevData = this.results.get(id) as (TestFailed | TestIgnored);

        if (!prevData || prevData.event === TestResultEvent.testStarted) {
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
        this.cleanupOldFlowIdMap();
        const id = this.generateId(testResult);

        const prevData = this.results.get(id)!;
        const event = this.isFault(prevData) ? prevData.event : testResult.event;
        const result = { ...prevData, ...testResult, event };
        this.results.delete(id);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TestResultEvent.testFailed, TestResultEvent.testIgnored].includes(testResult.event);
    }

    private generateId(testResult: TestSuiteStarted | TestStarted | TestFailed | TestIgnored | TestSuiteFinished | TestFinished) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}
