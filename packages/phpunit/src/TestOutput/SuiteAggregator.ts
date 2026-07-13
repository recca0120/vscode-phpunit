import { TeamcityEvent } from './types';

export type SuiteCounts = { passed: number; failed: number; skipped: number };

export class SuiteAggregator {
    private stacks = new Map<number, SuiteCounts[]>();

    open(flowId: number): void {
        const stack = this.stacks.get(flowId) ?? [];
        stack.push({ passed: 0, failed: 0, skipped: 0 });
        this.stacks.set(flowId, stack);
    }

    close(flowId: number): SuiteCounts {
        const stack = this.stacks.get(flowId);

        return stack?.pop() ?? { passed: 0, failed: 0, skipped: 0 };
    }

    record(flowId: number, event: TeamcityEvent): void {
        const stack = this.stacks.get(flowId);
        if (!stack) {
            return;
        }

        const key: keyof SuiteCounts =
            event === TeamcityEvent.testFailed
                ? 'failed'
                : event === TeamcityEvent.testIgnored
                  ? 'skipped'
                  : 'passed';

        for (const counts of stack) {
            counts[key] += 1;
        }
    }
}
