import { describe, expect, it, vi } from 'vitest';
import { TeamcityEvent, type TestFailed } from '../TestOutput';
import { TestRunnerEvent } from './TestRunnerEvent';
import { createTestRunnerEventProxy } from './TestRunnerEventProxy';

describe('TestRunnerEventProxy', () => {
    it('should notify listeners when event is emitted', () => {
        const proxy = createTestRunnerEventProxy();
        const callback = vi.fn();

        proxy.on(TestRunnerEvent.line, callback);
        proxy[TestRunnerEvent.line]('test line');

        expect(callback).toHaveBeenCalledWith('test line');
    });

    it('should notify listeners for teamcity events', () => {
        const proxy = createTestRunnerEventProxy();
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
        const proxy = createTestRunnerEventProxy();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        proxy.on(TestRunnerEvent.error, callback1);
        proxy.on(TestRunnerEvent.error, callback2);
        proxy[TestRunnerEvent.error]('some error');

        expect(callback1).toHaveBeenCalledWith('some error');
        expect(callback2).toHaveBeenCalledWith('some error');
    });
});
