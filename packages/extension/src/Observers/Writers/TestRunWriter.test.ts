import { describe, expect, it, vi } from 'vitest';
import type { TestRun } from 'vscode';
import { TestRunWriter } from './TestRunWriter';

describe('TestRunWriter', () => {
    it('append delegates to testRun.appendOutput', () => {
        const spy = vi.fn();
        const testRun = { appendOutput: spy } as unknown as TestRun;
        const writer = new TestRunWriter(testRun);

        writer.append('hello');

        expect(spy).toHaveBeenCalledWith('hello');
    });

    it('appendLine delegates to testRun.appendOutput with trailing newline', () => {
        const spy = vi.fn();
        const testRun = { appendOutput: spy } as unknown as TestRun;
        const writer = new TestRunWriter(testRun);

        writer.appendLine('hello');

        expect(spy).toHaveBeenCalledWith('hello\n');
    });
});
