import {
    TeamcityEvent,
    type TestFailed,
    type TestIgnored,
    type TestResult,
    type TestStarted,
    type TestSuiteStarted,
} from './types';

type KeyableResult = TestResult & { name: string; flowId: number };

export class TestResultCache {
    private cache = new Map<string, TestResult>();

    private buildKey(result: KeyableResult): string {
        return `${result.name}-${result.flowId}`;
    }

    get(result: KeyableResult): TestResult | undefined {
        return this.cache.get(this.buildKey(result));
    }

    set(result: KeyableResult, value: TestResult): void {
        this.cache.set(this.buildKey(result), value);
    }

    has(result: KeyableResult): boolean {
        return this.cache.has(this.buildKey(result));
    }

    delete(result: KeyableResult): boolean {
        return this.cache.delete(this.buildKey(result));
    }

    findLast(predicate: (result: TestResult) => boolean): TestResult | undefined {
        return Array.from(this.cache.values()).reverse().find(predicate);
    }

    findByPattern(
        pattern: RegExp,
        testResult: TestFailed | TestIgnored,
    ): (TestStarted | TestSuiteStarted) | undefined {
        for (const prev of Array.from(this.cache.values()).reverse()) {
            if (this.isTestStarted(pattern, prev)) {
                return prev as TestStarted | TestSuiteStarted;
            }

            if (prev.event === TeamcityEvent.testCount) {
                continue;
            }

            if (prev.event !== testResult.event) {
                break;
            }
        }

        return undefined;
    }

    private isTestStarted(pattern: RegExp, result: TestResult): boolean {
        return (
            (result.event === TeamcityEvent.testStarted ||
                result.event === TeamcityEvent.testSuiteStarted) &&
            pattern.test((result as TestResult & { locationHint?: string }).locationHint ?? '')
        );
    }
}
