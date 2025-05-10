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

    constructor(private testResultParser: TestResultParser = new TestResultParser()) { }

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
        this.results.set(id, testResult);

        return this.results.get(id);
    }

    private handleFault(testResult: TestFailed | TestIgnored): TestResult | undefined {
        const id = this.generateId(testResult);
        const existingResult = this.results.get(id) as TestFailed | TestIgnored | undefined;

        if (!existingResult) {
            // If no existing result, this is the first time we see this failed/ignored test
            // Create a new result object with a more specific ID if file is available
            const file = testResult.details?.[0]?.file;
            const newId = file ? [file, testResult.name].join('::') : id;
            const result = { ...testResult, id: newId, file, duration: testResult.duration ?? 0 };
            this.results.set(id, result); // Store the new result
            return result; // Return the new result
        }

        if (existingResult.event === TeamcityEvent.testStarted) {
            // If the existing result was just 'testStarted', update it with the fault details
            const updatedResult = { ...existingResult, ...testResult };
            this.results.set(id, updatedResult);
            return undefined; // Don't return a result yet, wait for testFinished
        }

        // If the existing result is already a fault, append message and details
        if (testResult.message) {
            existingResult.message = (existingResult.message ? existingResult.message + '\n\n' : '') + testResult.message;
        }
        if (testResult.details) {
            existingResult.details = [...(existingResult.details ?? []), ...testResult.details];
        }
        // Update the map with the modified existing result (though it's already modified by reference)
        this.results.set(id, existingResult);

        return undefined; // Don't return a result yet, wait for testFinished
    }

    private handleFinished(testResult: TestSuiteFinished | TestFinished) {
        const id = this.generateId(testResult);

        if (!this.results.has(id)) {
            return;
        }

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
