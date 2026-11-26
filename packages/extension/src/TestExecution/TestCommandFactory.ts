import { type Path, PathReplacer, PHPUnitXML, TestCommand } from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import type { TestRunProfileKind, WorkspaceFolder } from 'vscode';
import { Configuration } from '../Configuration';
import { TYPES } from '../types';
import { XdebugFactory } from './XdebugFactory';

@injectable()
export class TestCommandFactory {
    constructor(
        @inject(Configuration) private config: Configuration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
        @inject(TYPES.WorkspaceFolder) private workspaceFolder: WorkspaceFolder,
        @inject(XdebugFactory) private xdebugFactory: XdebugFactory,
    ) {}

    async create(profileKind?: TestRunProfileKind): Promise<TestCommand> {
        const options = { cwd: this.phpUnitXML.root() };
        const pathReplacer = new PathReplacer(
            options,
            this.config.get('paths') as Path,
            this.workspaceFolder.uri.fsPath,
        );
        const xdebug = await this.xdebugFactory.create(profileKind);
        return new TestCommand(this.config, options, pathReplacer, xdebug);
    }
}
