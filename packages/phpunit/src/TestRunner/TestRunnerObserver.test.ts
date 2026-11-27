import { describe, expectTypeOf, it } from 'vitest';
import type { TeamcityEvent } from '../TestOutput';
import type { EventResultMap, TestRunnerEvent } from './TestRunnerEvent';
import type { TestRunnerObserver } from './TestRunnerObserver';

describe('TestRunnerObserver', () => {
    it('has a handler for every TestRunnerEvent', () => {
        expectTypeOf<TestRunnerEvent>().toExtend<keyof EventResultMap>();
        expectTypeOf<TestRunnerEvent>().toExtend<keyof TestRunnerObserver>();
    });

    it('has a handler for every TeamcityEvent', () => {
        expectTypeOf<TeamcityEvent>().toExtend<keyof EventResultMap>();
        expectTypeOf<TeamcityEvent>().toExtend<keyof TestRunnerObserver>();
    });

    it('allows implementing only some handlers', () => {
        expectTypeOf<{
            testFailed: () => void;
            error: () => void;
        }>().toExtend<TestRunnerObserver>();
    });
});
