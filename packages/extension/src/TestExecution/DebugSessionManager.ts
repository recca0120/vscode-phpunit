import type { XdebugDebug } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { WorkspaceFolder } from 'vscode';
import { debug } from 'vscode';
import { TYPES } from '../types';

@injectable()
export class DebugSessionManager {
    constructor(@inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder) {}

    async wrap<T>(xdebug: XdebugDebug | undefined, fn: () => Promise<T>): Promise<T> {
        if (xdebug?.isEnabled()) {
            await debug.startDebugging(this.workspaceFolder, xdebug.debugTarget());
        }

        try {
            return await fn();
        } finally {
            if (xdebug?.isEnabled() && debug.activeDebugSession?.type === 'php') {
                debug.stopDebugging(debug.activeDebugSession);
            }
        }
    }
}
