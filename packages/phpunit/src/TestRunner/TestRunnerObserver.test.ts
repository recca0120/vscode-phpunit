import { describe, expect, it } from 'vitest';
import type { TestRunnerObserver } from './TestRunnerObserver';

describe('TestRunnerObserver', () => {
    describe('TestRunnerObserver type covers all events', () => {
        it('should allow implementing all TestRunnerEvent handlers', () => {
            const observer: TestRunnerObserver = {
                start: () => {},
                run: () => {},
                line: () => {},
                result: () => {},
                output: () => {},
                error: () => {},
                close: () => {},
                abort: () => {},
                done: () => {},
            };

            expect(observer.start).toBeDefined();
            expect(observer.run).toBeDefined();
            expect(observer.line).toBeDefined();
            expect(observer.result).toBeDefined();
            expect(observer.output).toBeDefined();
            expect(observer.error).toBeDefined();
            expect(observer.close).toBeDefined();
            expect(observer.abort).toBeDefined();
            expect(observer.done).toBeDefined();
        });

        it('should allow implementing all TeamcityEvent handlers', () => {
            const observer: TestRunnerObserver = {
                testVersion: () => {},
                testProcesses: () => {},
                testRuntime: () => {},
                testConfiguration: () => {},
                testSuiteStarted: () => {},
                testCount: () => {},
                testStarted: () => {},
                testFinished: () => {},
                testFailed: () => {},
                testIgnored: () => {},
                testSuiteFinished: () => {},
                testDuration: () => {},
                testResultSummary: () => {},
            };

            expect(observer.testVersion).toBeDefined();
            expect(observer.testProcesses).toBeDefined();
            expect(observer.testRuntime).toBeDefined();
            expect(observer.testConfiguration).toBeDefined();
            expect(observer.testSuiteStarted).toBeDefined();
            expect(observer.testCount).toBeDefined();
            expect(observer.testStarted).toBeDefined();
            expect(observer.testFinished).toBeDefined();
            expect(observer.testFailed).toBeDefined();
            expect(observer.testIgnored).toBeDefined();
            expect(observer.testSuiteFinished).toBeDefined();
            expect(observer.testDuration).toBeDefined();
            expect(observer.testResultSummary).toBeDefined();
        });

        it('should allow partial implementation (only some handlers)', () => {
            const observer: TestRunnerObserver = {
                testFailed: () => {},
                error: () => {},
            };

            expect(observer.testFailed).toBeDefined();
            expect(observer.error).toBeDefined();
            expect(observer.testFinished).toBeUndefined();
        });
    });
});
