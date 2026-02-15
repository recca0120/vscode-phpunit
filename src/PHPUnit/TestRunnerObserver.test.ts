import { describe, expect, it, vi } from 'vitest';
import { TeamcityEvent, type TestFailed } from './ProblemMatcher';
import {
    TestRunnerEvent,
    TestRunnerEventProxy,
    type TestRunnerObserver,
} from './TestRunnerObserver';

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

    describe('EventResultMap covers all events', () => {
        it('should have keys for every TestRunnerEvent', () => {
            const allRunnerEvents = Object.values(TestRunnerEvent);
            const mapKeys = new Set<string>();

            // EventResultMap keys are verified by TypeScript at compile time,
            // but we verify at runtime that the proxy registers all events
            const proxy = new TestRunnerEventProxy();
            for (const event of allRunnerEvents) {
                expect(typeof proxy[event]).toBe('function');
                mapKeys.add(event);
            }

            expect(mapKeys.size).toBe(allRunnerEvents.length);
        });

        it('should have keys for every TeamcityEvent', () => {
            const allTeamcityEvents = Object.values(TeamcityEvent);
            const proxy = new TestRunnerEventProxy();

            for (const event of allTeamcityEvents) {
                expect(typeof proxy[event]).toBe('function');
            }
        });
    });

    describe('TestRunnerEventProxy', () => {
        it('should notify listeners when event is emitted', () => {
            const proxy = new TestRunnerEventProxy();
            const callback = vi.fn();

            proxy.on(TestRunnerEvent.line, callback);
            proxy[TestRunnerEvent.line]('test line');

            expect(callback).toHaveBeenCalledWith('test line');
        });

        it('should notify listeners for teamcity events', () => {
            const proxy = new TestRunnerEventProxy();
            const callback = vi.fn();

            proxy.on(TeamcityEvent.testFailed, callback);
            const fakeResult = {
                event: TeamcityEvent.testFailed,
                name: 'test',
                flowId: 1,
            } as unknown as TestFailed;
            proxy[TeamcityEvent.testFailed](fakeResult);

            expect(callback).toHaveBeenCalledWith(fakeResult);
        });

        it('should support multiple listeners for the same event', () => {
            const proxy = new TestRunnerEventProxy();
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            proxy.on(TestRunnerEvent.error, callback1);
            proxy.on(TestRunnerEvent.error, callback2);
            proxy[TestRunnerEvent.error]('some error');

            expect(callback1).toHaveBeenCalledWith('some error');
            expect(callback2).toHaveBeenCalledWith('some error');
        });
    });
});
