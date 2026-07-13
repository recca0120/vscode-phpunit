import { describe, expect, it } from 'vitest';
import { SuiteAggregator } from './SuiteAggregator';
import { TeamcityEvent } from './types';

describe('SuiteAggregator', () => {
    it('starts a suite with zeroed counts', () => {
        const aggregator = new SuiteAggregator();

        aggregator.open(1);

        expect(aggregator.close(1)).toEqual({ passed: 0, failed: 0, skipped: 0 });
    });

    it('bumps the matching bucket for each recorded event', () => {
        const aggregator = new SuiteAggregator();

        aggregator.open(1);
        aggregator.record(1, TeamcityEvent.testFinished);
        aggregator.record(1, TeamcityEvent.testFinished);
        aggregator.record(1, TeamcityEvent.testFailed);
        aggregator.record(1, TeamcityEvent.testIgnored);

        expect(aggregator.close(1)).toEqual({ passed: 2, failed: 1, skipped: 1 });
    });

    it('bubbles a record to every open ancestor for the same flowId', () => {
        const aggregator = new SuiteAggregator();

        aggregator.open(1);
        aggregator.open(1);
        aggregator.record(1, TeamcityEvent.testFailed);

        expect(aggregator.close(1)).toEqual({ passed: 0, failed: 1, skipped: 0 });
        expect(aggregator.close(1)).toEqual({ passed: 0, failed: 1, skipped: 0 });
    });

    it('keeps counts isolated per flowId', () => {
        const aggregator = new SuiteAggregator();

        aggregator.open(1);
        aggregator.open(2);
        aggregator.record(1, TeamcityEvent.testFailed);
        aggregator.record(2, TeamcityEvent.testFinished);

        expect(aggregator.close(1)).toEqual({ passed: 0, failed: 1, skipped: 0 });
        expect(aggregator.close(2)).toEqual({ passed: 1, failed: 0, skipped: 0 });
    });

    it('records nothing and returns zeroed counts when no suite is open', () => {
        const aggregator = new SuiteAggregator();

        aggregator.record(1, TeamcityEvent.testFailed);

        expect(aggregator.close(1)).toEqual({ passed: 0, failed: 0, skipped: 0 });
    });
});
