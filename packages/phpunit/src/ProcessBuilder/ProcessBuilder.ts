import type { SpawnOptions } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IConfiguration, PathReplacer } from '../Configuration';
import type { TestResult } from '../TestOutput';
import { cloneInstance } from '../utils';
import { CommandTemplateEnvironment, type Environment } from './Environment';
import { type Arg, type Invocation, intactArg, pathArg } from './Invocation';
import type { Xdebug } from './Xdebug';

export class ProcessBuilder {
    private arguments = '';

    constructor(
        private configuration: IConfiguration,
        private options: SpawnOptions,
        private readonly pathReplacer: PathReplacer,
        private xdebug?: Xdebug,
    ) {}

    clone(): ProcessBuilder {
        const cloned = cloneInstance(this);
        if (this.xdebug) {
            cloned.xdebug = this.xdebug.clone();
        }
        return cloned;
    }

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    getXdebug() {
        return this.xdebug;
    }

    getCwd() {
        return String(this.options.cwd ?? '.');
    }

    isCoverageMode() {
        return this.xdebug?.isCoverageMode() ?? false;
    }

    async ensureCacheDir() {
        if (!this.isCoverageMode()) {
            return;
        }
        await mkdir(this.cacheDir(), { recursive: true });
    }

    getCloverFile() {
        return this.xdebug?.getCloverFile();
    }

    assignCloverFile(index: number) {
        if (!this.isCoverageMode()) {
            return;
        }
        const cloverFile = join(
            this.cacheDir(),
            `coverage-${randomBytes(4).toString('hex')}-${index}.xml`,
        );
        this.xdebug?.setCloverFile(cloverFile);
    }

    private cacheDir() {
        return join(this.getCwd(), '.phpunit.cache');
    }

    getPathReplacer() {
        return this.pathReplacer;
    }

    build() {
        return this.environment().launch(this.invocation());
    }

    replacePath(result: TestResult): TestResult {
        const replaced: Record<string, unknown> = {};

        if ('locationHint' in result && result.locationHint) {
            replaced.locationHint = this.pathReplacer.toLocal(result.locationHint);
        }

        if ('file' in result && result.file) {
            replaced.file = this.pathReplacer.toLocal(result.file);
        }

        if ('details' in result) {
            replaced.details = result.details.map(({ file, line }) => ({
                file: this.pathReplacer.toLocal(file),
                line,
            }));
        }

        return Object.keys(replaced).length > 0 ? { ...result, ...replaced } : result;
    }

    toString() {
        const { runtime, args } = this.build();

        return `${runtime} ${args.join(' ')}`;
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
            phpArgs: this.xdebug?.getPhpArgs() ?? [],
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

        return [...args, ...(this.xdebug?.getPhpUnitArgs(this.pathReplacer) ?? [])];
    }

    private getEnvironment() {
        return {
            ...process.env,
            ...this.xdebug?.getEnvironment(),
            ...(this.configuration.get('environment') ?? {}),
        };
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
