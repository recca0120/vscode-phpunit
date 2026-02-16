import { inject, injectable } from 'inversify';
import { debug, workspace } from 'vscode';
import { Mode, type Xdebug } from '../PHPUnit';
import { TestCollection } from '../TestCollection';

@injectable()
export class DebugSessionManager {
    constructor(
        @inject(TestCollection) private testCollection: TestCollection,
    ) {}

    async wrap(xdebug: Xdebug | undefined, fn: () => Promise<void>): Promise<void> {
        if (xdebug?.mode === Mode.debug) {
            const wsf = workspace.getWorkspaceFolder(this.testCollection.getRootUri());
            // TODO(#346): await debug session attachment before running tests
            await debug.startDebugging(wsf, xdebug.name ?? (await xdebug.getDebugConfiguration()));
        }

        await fn();

        if (xdebug?.mode === Mode.debug && debug.activeDebugSession?.type === 'php') {
            debug.stopDebugging(debug.activeDebugSession);
        }
    }
}
