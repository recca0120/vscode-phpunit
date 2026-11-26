import type { SpawnOptions } from 'node:child_process';
import type { IConfiguration } from '../Configuration';
import type { PathMapper, PathResolver } from '../Path';
import { cloneInstance } from '../utils';
import { CommandTemplateEnvironment, type Environment } from './Environment';
import { type Arg, type Invocation, intactArg, pathArg } from './Invocation';
import type { CommandOption } from './Option/CommandOption';
import { XdebugCoverage } from './Option/XdebugCoverage';
import { XdebugDebug } from './Option/XdebugDebug';

export class TestCommand {
    private arguments = '';

    constructor(
        private configuration: IConfiguration,
        private options: SpawnOptions,
        private readonly pathResolver: PathResolver,
        private commandOptions: CommandOption[] = [],
    ) {}

    withArguments(args: string): TestCommand {
        const cloned = this.clone();
        cloned.arguments = args.trim();
        return cloned;
    }

    withCoverageClover(cloverFile: string): TestCommand {
        const cloned = this.clone();
        cloned.commandOptions = this.commandOptions.map((option) =>
            option instanceof XdebugCoverage ? option.withCloverFile(cloverFile) : option,
        );
        return cloned;
    }

    debug(): XdebugDebug | undefined {
        return this.commandOptions.find((option) => option instanceof XdebugDebug);
    }

    coverage(): XdebugCoverage | undefined {
        return this.commandOptions.find((option) => option instanceof XdebugCoverage);
    }

    getCwd() {
        return String(this.options.cwd ?? '.');
    }

    getCloverFile() {
        return this.coverage()?.getCloverFile();
    }

    get paths(): PathMapper {
        return this.pathResolver;
    }

    build() {
        return this.environment().launch(this.invocation());
    }

    toString() {
        const { runtime, args } = this.build();

        return `${runtime} ${args.join(' ')}`;
    }

    private clone(): TestCommand {
        return cloneInstance(this);
    }

    private environment(): Environment {
        return new CommandTemplateEnvironment(
            this.getConfigString('command'),
            this.pathResolver,
            (text) => this.pathResolver.resolveVariables(text),
        );
    }

    private invocation(): Invocation {
        return {
            php: this.getConfigString('php'),
            phpArgs: this.enabledOptions().flatMap((option) => option.phpArgs()),
            binary: this.getConfigString('phpunit'),
            args: this.phpUnitArgs(),
            options: { ...this.options, env: this.getEnvironment() },
        };
    }

    private phpUnitArgs(): Arg[] {
        const userArgs = this.configuration.arguments(this.arguments);
        const filters = userArgs.filter((arg) => /^--filter=/.test(arg));
        const lastFilter = filters[filters.length - 1]?.match(/^--filter=(.*)/)?.[1];

        const args: Arg[] = userArgs.map((arg) =>
            /^--filter=/.test(arg) ? intactArg(`--filter=${lastFilter}`) : pathArg(arg),
        );
        args.push('--colors=always', '--teamcity');
        if (filters.length > 0 && this.isParaTest()) {
            args.push('--functional');
        }

        return [
            ...args,
            ...this.enabledOptions().flatMap((option) => option.phpUnitArgs(this.pathResolver)),
        ];
    }

    private getEnvironment() {
        return {
            ...process.env,
            ...Object.assign({}, ...this.enabledOptions().map((option) => option.environment())),
            ...(this.configuration.get('environment') ?? {}),
        };
    }

    private enabledOptions(): CommandOption[] {
        return this.commandOptions.filter((option) => option.isEnabled());
    }

    private getConfigString(key: string) {
        return String(this.configuration.get(key) ?? '');
    }

    private isParaTest() {
        return (
            /paratest/.test(this.getConfigString('command')) ||
            /paratest/.test(this.getConfigString('phpunit'))
        );
    }
}
