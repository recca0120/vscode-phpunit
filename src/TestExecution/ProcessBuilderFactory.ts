import { inject, injectable } from 'inversify';
import { TestRunProfileKind } from 'vscode';
import { Configuration } from '../Configuration';
import { Mode, PHPUnitXML, ProcessBuilder, Xdebug } from '../PHPUnit';

@injectable()
export class ProcessBuilderFactory {
    constructor(
        @inject(Configuration) private config: Configuration,
        @inject(PHPUnitXML) private phpUnitXML: PHPUnitXML,
    ) {}

    async create(profileKind?: TestRunProfileKind): Promise<ProcessBuilder> {
        const builder = new ProcessBuilder(this.config, { cwd: this.phpUnitXML.root() });
        const xdebug = new Xdebug(this.config);
        builder.setXdebug(xdebug);
        await xdebug.setMode(this.toMode(profileKind));
        return builder;
    }

    private toMode(profileKind?: TestRunProfileKind): Mode | undefined {
        switch (profileKind) {
            case TestRunProfileKind.Debug: return Mode.debug;
            case TestRunProfileKind.Coverage: return Mode.coverage;
            default: return undefined;
        }
    }
}
