import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import { debug, Uri } from 'vscode';
import { Mode } from '../PHPUnit';
import { DebugSessionManager } from './DebugSessionManager';

describe('DebugSessionManager', () => {
    let manager: DebugSessionManager;

    beforeEach(() => {
        vi.clearAllMocks();
        const workspaceFolder = {
            index: 0,
            name: 'test',
            uri: Uri.file('/workspace'),
        } as WorkspaceFolder;
        manager = new DebugSessionManager(workspaceFolder);
    });

    it('should stop debugging even if fn throws', async () => {
        const xdebug = {
            mode: Mode.debug,
            name: 'Listen for Xdebug',
            getDebugConfiguration: vi.fn(),
        };

        (debug as unknown as { activeDebugSession: { type: string } }).activeDebugSession = {
            type: 'php',
        };

        const error = new Error('test run failed');
        await expect(
            manager.wrap(xdebug as unknown as import('../PHPUnit').Xdebug, async () => {
                throw error;
            }),
        ).rejects.toThrow('test run failed');

        expect(debug.stopDebugging).toHaveBeenCalled();
    });
});
