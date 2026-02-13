import type { TestResult } from './types';

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

    asMap(): Map<string, TestResult> {
        return this.cache;
    }
}
