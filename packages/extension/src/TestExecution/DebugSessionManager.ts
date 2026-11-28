import type { XdebugDebug } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { DebugSession, WorkspaceFolder } from 'vscode';
import { debug } from 'vscode';
import { TYPES } from '../types';

@injectable()
export class DebugSessionManager {
    constructor(@inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder) {}

    async wrap<T>(xdebug: XdebugDebug | undefined, fn: () => Promise<T>): Promise<T> {
        const session = xdebug?.isEnabled() ? await this.startDebugging(xdebug) : undefined;

        try {
            return await fn();
        } finally {
            if (session) {
                debug.stopDebugging(session);
            }
        }
    }

    private async startDebugging(xdebug: XdebugDebug): Promise<DebugSession | undefined> {
        let session: DebugSession | undefined;
        const listener = debug.onDidStartDebugSession((started) => {
            if (!session && this.belongsToFolder(started)) {
                session = started;
            }
        });

        try {
            await debug.startDebugging(this.workspaceFolder, xdebug.debugTarget());
        } finally {
            listener.dispose();
        }

        return session;
    }

    private belongsToFolder(session: DebugSession) {
        if (session.type !== 'php') {
            return false;
        }

        return (
            !session.workspaceFolder ||
            session.workspaceFolder.uri.toString() === this.workspaceFolder.uri.toString()
        );
    }
}
