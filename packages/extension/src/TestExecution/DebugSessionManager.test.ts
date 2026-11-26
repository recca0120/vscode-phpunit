import { Configuration, Mode, PathReplacer, TestCommand, Xdebug } from '@vscode-phpunit/phpunit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import { debug, Uri } from 'vscode';
import { DebugSessionManager } from './DebugSessionManager';

const givenCommand = async (opts?: { mode?: Mode; debuggerConfig?: string }) => {
    const config = new Configuration({
        php: 'php',
        phpunit: 'vendor/bin/phpunit',
        ...(opts?.debuggerConfig ? { debuggerConfig: opts.debuggerConfig } : {}),
    });
    const options = { cwd: '.' };
    const pathReplacer = new PathReplacer(options, {});
    let xdebug: Xdebug | undefined;
    if (opts?.mode) {
        xdebug = await new Xdebug(config).setMode(opts.mode);
    }
    return new TestCommand(config, options, pathReplacer, xdebug);
};

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
        const command = await givenCommand({
            mode: Mode.debug,
            debuggerConfig: 'Listen for Xdebug',
        });

        (debug as unknown as { activeDebugSession: { type: string } }).activeDebugSession = {
            type: 'php',
        };

        const error = new Error('test run failed');
        await expect(
            manager.wrap(command, async () => {
                throw error;
            }),
        ).rejects.toThrow('test run failed');

        expect(debug.stopDebugging).toHaveBeenCalled();
    });

    it('should pass through when not in debug mode', async () => {
        const command = await givenCommand({ mode: Mode.coverage });

        const result = await manager.wrap(command, async () => 'passthru');

        expect(result).toBe('passthru');
        expect(debug.startDebugging).not.toHaveBeenCalled();
    });

    it('should pass through when no xdebug', async () => {
        const command = await givenCommand();

        const result = await manager.wrap(command, async () => 'passthru');

        expect(result).toBe('passthru');
        expect(debug.startDebugging).not.toHaveBeenCalled();
    });
});
