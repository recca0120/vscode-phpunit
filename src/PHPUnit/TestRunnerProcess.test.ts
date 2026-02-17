import { describe, expect, it, vi } from 'vitest';
import { TestRunnerProcess } from './TestRunnerProcess';

describe('TestRunnerProcess', () => {
    it('run() resolves after abort()', async () => {
        const builder = {
            build: () => ({ runtime: 'echo', args: ['hello'], options: {} }),
            getXdebug: () => undefined,
        };

        const process = new TestRunnerProcess(builder as any);

        // Stub execute to prevent actual spawn
        vi.spyOn(process as any, 'execute').mockImplementation(() => {});

        const promise = process.run();
        process.abort();

        await expect(promise).resolves.toBe(true);
    });
});
