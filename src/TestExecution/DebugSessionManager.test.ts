import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import { debug, Uri } from 'vscode';
import type { ProcessBuilder } from '../PHPUnit';
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
            isDebugMode: () => true,
            name: 'Listen for Xdebug',
            getDebugConfiguration: vi.fn(),
        };
        const builder = {
            getXdebug: () => xdebug,
        } as unknown as ProcessBuilder;

        (debug as unknown as { activeDebugSession: { type: string } }).activeDebugSession = {
            type: 'php',
        };

        const error = new Error('test run failed');
        await expect(
            manager.wrap(builder, async () => {
                throw error;
            }),
        ).rejects.toThrow('test run failed');

        expect(debug.stopDebugging).toHaveBeenCalled();
    });

    it('should not start debugging when not in debug mode', async () => {
        const builder = {
            getXdebug: () => ({ isDebugMode: () => false }),
        } as unknown as ProcessBuilder;

        const fn = vi.fn();
        await manager.wrap(builder, fn);

        expect(debug.startDebugging).not.toHaveBeenCalled();
        expect(fn).toHaveBeenCalled();
    });

    it('should not start debugging when no xdebug', async () => {
        const builder = {
            getXdebug: () => undefined,
        } as unknown as ProcessBuilder;

        const fn = vi.fn();
        await manager.wrap(builder, fn);

        expect(debug.startDebugging).not.toHaveBeenCalled();
        expect(fn).toHaveBeenCalled();
    });
});
