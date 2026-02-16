import { inject, injectable } from 'inversify';
import type { WorkspaceFolder } from 'vscode';
import { debug } from 'vscode';
import { Mode, type Xdebug } from '../PHPUnit';
import { TYPES } from '../types';

@injectable()
export class DebugSessionManager {
    constructor(
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
    ) {}

    async wrap(xdebug: Xdebug | undefined, fn: () => Promise<void>): Promise<void> {
        if (xdebug?.mode === Mode.debug) {
            // TODO(#346): await debug session attachment before running tests
            await debug.startDebugging(this.workspaceFolder, xdebug.name ?? (await xdebug.getDebugConfiguration()));
        }

        try {
            await fn();
        } finally {
            if (xdebug?.mode === Mode.debug && debug.activeDebugSession?.type === 'php') {
                debug.stopDebugging(debug.activeDebugSession);
            }
        }
    }
}
