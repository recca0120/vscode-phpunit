import type { ProcessBuilder } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { WorkspaceFolder } from 'vscode';
import { debug } from 'vscode';
import { TYPES } from '../types';

@injectable()
export class DebugSessionManager {
    constructor(@inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder) {}

    async wrap<T>(builder: ProcessBuilder, fn: () => Promise<T>): Promise<T> {
        const xdebug = builder.getXdebug();

        if (xdebug?.isDebugMode()) {
            // TODO(#346): await debug session attachment before running tests
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
