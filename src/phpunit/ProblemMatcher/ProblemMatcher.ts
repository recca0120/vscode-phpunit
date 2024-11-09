import { TestCount, TestResult, TestResultEvent, TestResultParser, TestResultSummary, TimeAndMemory } from './parser';

export class ProblemMatcher {
    private collect = new Map<string, TestResult>();

    private lookup: { [p: string]: Function } = {
        [TestResultEvent.testSuiteStarted]: this.handleStarted,
        [TestResultEvent.testStarted]: this.handleStarted,
        [TestResultEvent.testSuiteFinished]: this.handleFinished,
        [TestResultEvent.testFinished]: this.handleFinished,
        [TestResultEvent.testFailed]: this.handleFault,
        [TestResultEvent.testIgnored]: this.handleFault,
    };

    constructor(private parser: TestResultParser = new TestResultParser()) {
    }

    parse(
        input: string | Buffer,
    ): TestResult | TestCount | TestResultSummary | TimeAndMemory | undefined {
        const result = this.parser.parse(input.toString());

        return this.isTestResult(result)
            ? this.lookup[(result as TestResult).event]?.call(this, result as TestResult)
            : result;
    }

    private isTestResult(result: any | undefined) {
        return result && 'event' in result && 'name' in result && 'flowId' in result;
    }

    private handleStarted(testResult: TestResult) {
        const id = this.generateId(testResult);
        this.collect.set(id, { ...testResult });

        return this.collect.get(id);
    }

    private handleFault(testResult: TestResult) {
        const id = this.generateId(testResult);
        const prevData = this.collect.get(id);

        if (!prevData || prevData.kind === TestResultEvent.testStarted) {
            this.collect.set(id, { ...(prevData ?? {}), ...testResult });
            return;
        }

        if (testResult.message) {
            prevData.message += '\n\n' + testResult.message;
        }
        prevData.details.push(...testResult.details);

        this.collect.set(id, prevData);
    }

    private handleFinished(testResult: TestResult) {
        const id = this.generateId(testResult);

        const prevData = this.collect.get(id)!;
        const event = this.isFault(prevData) ? prevData.event : testResult.event;
        const kind = event;
        const result = { ...prevData, ...testResult, event, kind };
        this.collect.delete(id);

        return result;
    }

    private isFault(testResult: TestResult) {
        return [TestResultEvent.testFailed, TestResultEvent.testIgnored].includes(testResult.event);
    }

    private generateId(testResult: TestResult) {
        return `${testResult.name}-${testResult.flowId}`;
    }
}
