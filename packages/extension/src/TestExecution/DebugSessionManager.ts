import type { TestCommand } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { WorkspaceFolder } from 'vscode';
import { debug } from 'vscode';
import { TYPES } from '../types';

@injectable()
export class DebugSessionManager {
    constructor(@inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder) {}

    async wrap<T>(command: TestCommand, fn: () => Promise<T>): Promise<T> {
        const xdebug = command.getXdebug();
        if (xdebug?.isDebugMode()) {
            await debug.startDebugging(
                this.workspaceFolder,
                xdebug.name ?? (await xdebug.getDebugConfiguration()),
            );
        }

        try {
            return await fn();
        } finally {
            if (xdebug?.isDebugMode() && debug.activeDebugSession?.type === 'php') {
                debug.stopDebugging(debug.activeDebugSession);
            }
        }
    }
}
