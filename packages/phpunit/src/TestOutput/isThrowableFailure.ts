import type { TestFailed } from './types';

const THROWABLE_PATTERN = /^\\?[A-Za-z_][\w\\]*\s?: /;

export const isThrowableFailure = ({ message }: Pick<TestFailed, 'message'>) =>
    THROWABLE_PATTERN.test(message.trim()) && !message.includes('Failed asserting');
