import {
    Mode,
    type Path,
    PathReplacer,
    PHPUnitXML,
    ProcessBuilder,
    Xdebug,
} from '@vscode-phpunit/phpunit';
import { inject, injectable } from 'inversify';
import { TestRunProfileKind } from 'vscode';
import { Configuration } from '../Configuration';

@injectable()
export class ProcessBuilderFactory {
    constructor(
        @inject(Configuration) private config: Configuration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
    ) {}

    async create(profileKind?: TestRunProfileKind): Promise<ProcessBuilder> {
        const options = { cwd: this.phpUnitXML.root() };
        const pathReplacer = new PathReplacer(options, this.config.get('paths') as Path);
        const xdebug = await new Xdebug(this.config).setMode(this.toMode(profileKind));
        return new ProcessBuilder(this.config, options, pathReplacer, xdebug);
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
