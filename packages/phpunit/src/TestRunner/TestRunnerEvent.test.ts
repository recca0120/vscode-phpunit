import { describe, expect, it } from 'vitest';
import { TeamcityEvent } from '../TestOutput';
import { TestRunnerEvent } from './TestRunnerEvent';
import { createTestRunnerEventProxy } from './TestRunnerEventProxy';

describe('EventResultMap covers all events', () => {
    it('should have keys for every TestRunnerEvent', () => {
        const allRunnerEvents = Object.values(TestRunnerEvent);
        const mapKeys = new Set<string>();

        const proxy = createTestRunnerEventProxy();
        for (const event of allRunnerEvents) {
            expect(typeof proxy[event]).toBe('function');
            mapKeys.add(event);
        }

        expect(mapKeys.size).toBe(allRunnerEvents.length);
    });

    it('should have keys for every TeamcityEvent', () => {
        const allTeamcityEvents = Object.values(TeamcityEvent);
        const proxy = createTestRunnerEventProxy();

        for (const event of allTeamcityEvents) {
            expect(typeof proxy[event]).toBe('function');
        }
    });
});
