import type { SpawnOptions } from 'node:child_process';
import type { IConfiguration, PathMapper, PathReplacer } from '../Configuration';
import { cloneInstance } from '../utils';
import type { CommandOption } from './CommandOption';
import { CommandTemplateEnvironment, type Environment } from './Environment';
import { type Arg, type Invocation, intactArg, pathArg } from './Invocation';
import type { Xdebug } from './Xdebug';

export class TestCommand {
    private arguments = '';

    constructor(
        private configuration: IConfiguration,
        private options: SpawnOptions,
        private readonly pathReplacer: PathReplacer,
        private xdebug?: Xdebug,
    ) {}

    withArguments(args: string): TestCommand {
        const cloned = this.clone();
        cloned.arguments = args.trim();
        return cloned;
    }

    withCoverageClover(cloverFile: string): TestCommand {
        const cloned = this.clone();
        cloned.xdebug?.setCloverFile(cloverFile);
        return cloned;
    }

    getXdebug() {
        return this.xdebug;
    }

    getCwd() {
        return String(this.options.cwd ?? '.');
    }

    getCloverFile() {
        return this.xdebug?.getCloverFile();
    }

    get paths(): PathMapper {
        return this.pathReplacer;
    }

    build() {
        return this.environment().launch(this.invocation());
    }

    toString() {
        const { runtime, args } = this.build();

        return `${runtime} ${args.join(' ')}`;
    }

    private clone(): TestCommand {
        const cloned = cloneInstance(this);
        if (this.xdebug) {
            cloned.xdebug = this.xdebug.clone();
        }
        return cloned;
    }

    private environment(): Environment {
        return new CommandTemplateEnvironment(
            this.getConfigString('command'),
            this.pathReplacer,
            (text) => this.pathReplacer.replacePathVariables(text),
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
        const userArgs = this.configuration.getArguments(this.arguments);
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
            ...this.enabledOptions().flatMap((option) => option.phpUnitArgs(this.pathReplacer)),
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
        return (this.xdebug?.options() ?? []).filter((option) => option.isEnabled());
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
