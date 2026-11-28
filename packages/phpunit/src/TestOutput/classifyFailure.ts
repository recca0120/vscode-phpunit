import type { TestFailed } from './types';

export type FailureCategory = 'risky' | 'failure' | 'error';

const THROWABLE_PATTERN = /^\\?[A-Za-z_][\w\\]*\s?: /;

export const classifyFailure = ({
    message,
    details,
}: Pick<TestFailed, 'message' | 'details'>): FailureCategory => {
    if (message === 'This test did not perform any assertions' && details.length === 0) {
        return 'risky';
    }
    if (THROWABLE_PATTERN.test(message.trim()) && !message.includes('Failed asserting')) {
        return 'error';
    }

    return 'failure';
};
