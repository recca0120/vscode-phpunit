import { TeamcityEvent } from './types';

export type SuiteCounts = { passed: number; failed: number; skipped: number };
export type SuiteBucket = keyof SuiteCounts;

export function classifyEvent(event: TeamcityEvent): SuiteBucket {
    if (event === TeamcityEvent.testFailed) {
        return 'failed';
    }
    if (event === TeamcityEvent.testIgnored) {
        return 'skipped';
    }

    return 'passed';
}

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

        const bucket = classifyEvent(event);
        for (const counts of stack) {
            counts[bucket] += 1;
        }
    }
}
