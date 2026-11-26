import { Mode, Xdebug } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import { TestRunProfileKind, type WorkspaceFolder, workspace } from 'vscode';
import { Configuration } from '../Configuration';
import { TYPES } from '../types';

@injectable()
export class XdebugFactory {
    constructor(
        @inject(Configuration) private config: Configuration,
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
    ) {}

    create(profileKind?: TestRunProfileKind): Promise<Xdebug> {
        return new Xdebug(this.config).setMode(this.toMode(profileKind), this.launchPort());
    }

    private launchPort(): number | undefined {
        const name = this.config.get('debuggerConfig') as string | undefined;
        if (!name) {
            return undefined;
        }

        const configurations =
            workspace
                .getConfiguration('launch', this.workspaceFolder.uri)
                .get<{ name: string; port?: number }[]>('configurations') ?? [];

        return configurations.find((configuration) => configuration.name === name)?.port;
    }

    private toMode(profileKind?: TestRunProfileKind): Mode | undefined {
        switch (profileKind) {
            case TestRunProfileKind.Debug:
                return Mode.debug;
            case TestRunProfileKind.Coverage:
                return Mode.coverage;
            default:
                return undefined;
        }
    }
}
