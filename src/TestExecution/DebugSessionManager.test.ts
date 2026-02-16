import { beforeEach, describe, expect, it, vi } from 'vitest';
import { debug } from 'vscode';
import { URI } from 'vscode-uri';
import { Mode } from '../PHPUnit';
import type { TestCollection } from '../TestCollection';
import { DebugSessionManager } from './DebugSessionManager';

describe('DebugSessionManager', () => {
    let manager: DebugSessionManager;

    beforeEach(() => {
        vi.clearAllMocks();
        const testCollection = {
            getRootUri: () => URI.file('/workspace'),
        } as unknown as TestCollection;
        manager = new DebugSessionManager(testCollection);
    });

    it('should stop debugging even if fn throws', async () => {
        const xdebug = {
            mode: Mode.debug,
            name: 'Listen for Xdebug',
            getDebugConfiguration: vi.fn(),
        };

        (debug as any).activeDebugSession = { type: 'php' };

        const error = new Error('test run failed');
        await expect(
            manager.wrap(xdebug as any, async () => {
                throw error;
            }),
        ).rejects.toThrow('test run failed');

        expect(debug.stopDebugging).toHaveBeenCalled();
    });
});
