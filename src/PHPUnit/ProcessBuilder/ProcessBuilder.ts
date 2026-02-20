import type { SpawnOptions } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IConfiguration } from '../Configuration';
import { CMD_TEMPLATE, CMD_TEMPLATE_QUOTED } from '../constants';
import type { PathReplacer } from '../PathReplacer';
import type { TestResult } from '../TestOutput';
import { cloneInstance, parseArgv } from '../utils';
import { base64DecodeFilter, base64EncodeFilter } from './FilterEncoder';
import type { Xdebug } from './Xdebug';

const isSSH = (command: string) => /^ssh/.test(command);
const isShellCommand = (command: string) => /sh\s+-c/.test(command);
const keyVariable = (key: string) => `\${${key}}`;

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
        const [runtime, ...args] = this.create()
            .filter((input: string) => !!input)
            .map((input: string) => this.pathReplacer.replacePathVariables(input).trim());

        return { runtime, args, options: { ...this.options, env: this.getEnvironment() } };
    }

    replacePath(result: TestResult) {
        if ('locationHint' in result && result.locationHint) {
            result.locationHint = this.pathReplacer.toLocal(result.locationHint);
        }

        if ('file' in result && result.file) {
            result.file = this.pathReplacer.toLocal(result.file);
        }

        if ('details' in result) {
            result.details = result.details.map(({ file, line }) => ({
                file: this.pathReplacer.toLocal(file),
                line,
            }));
        }

        return result;
    }

    toString() {
        const { runtime, args } = this.build();

        return `${runtime} ${args.join(' ')}`;
    }

    private create() {
        let command = this.getConfigString('command');
        const isRemoteCommand = isSSH(command) || isShellCommand(command);
        const args = this.getArguments();

        command = this.ensureVariablePlaceholders(command, args, isRemoteCommand);
        command = this.convertSingleToDoubleQuotes(command);
        command = this.removeEmptyPhpArgs(command, args);
        command = this.substituteVariables(command, args);

        return base64DecodeFilter(parseArgv(command), isRemoteCommand);
    }

    private ensureVariablePlaceholders(
        command: string,
        args: { [p: string]: string },
        isRemoteCommand: boolean,
    ) {
        if (this.hasVariable(args, command)) {
            return command;
        }

        return command + (isRemoteCommand ? ` ${CMD_TEMPLATE_QUOTED}` : ` ${CMD_TEMPLATE}`);
    }

    private convertSingleToDoubleQuotes(command: string) {
        return command.replace(/('\${(php|phpargs|phpunit|phpunitargs)}.*?')/g, (_m, ...matched) =>
            matched[0].replace(/^['"]|['"]$/g, '"'),
        );
    }

    private removeEmptyPhpArgs(command: string, args: { [p: string]: string }) {
        return args.phpargs ? command : command.replace(/\s+\$\{phpargs\}/, '');
    }

    private substituteVariables(command: string, variableMap: { [p: string]: string }) {
        return Object.entries(variableMap).reduce(
            (cmd, [key, value]) => cmd.replace(keyVariable(key), value.trim()),
            command.trim(),
        );
    }

    private getArguments() {
        return {
            php: this.quoteIfNeeded(this.pathReplacer.toRemote(this.getConfigString('php'))),
            phpargs: this.getPhpArgs(),
            phpunit: this.quoteIfNeeded(
                this.pathReplacer.toRemote(this.getConfigString('phpunit')),
            ),
            phpunitargs: this.getPhpUnitArgs(),
        };
    }

    private getEnvironment() {
        return {
            ...process.env,
            ...this.xdebug?.getEnvironment(),
            ...(this.configuration.get('environment') ?? {}),
        };
    }

    private getPhpArgs() {
        return this.xdebug?.getPhpArgs().join(' ') ?? '';
    }

    private getConfigString(key: string) {
        return String(this.configuration.get(key) ?? '');
    }

    private quoteIfNeeded(value: string) {
        const hasSpaces = value?.includes(' ');
        const isUnquoted = !/^["']/.test(value);
        const isPath = /[/\\]/.test(value);

        if (hasSpaces && isUnquoted && isPath) {
            return `"${value}"`;
        }
        return value;
    }

    private getPhpUnitArgs() {
        const args = this.configuration
            .getArguments(this.arguments)
            .map((arg: string) =>
                /^--filter/.test(arg) ? arg : this.quoteIfNeeded(this.pathReplacer.toRemote(arg)),
            )
            .concat('--colors=never', '--teamcity');

        return base64EncodeFilter(this.addParaTestFunctional(args))
            .concat(...(this.xdebug?.getPhpUnitArgs(this.pathReplacer) ?? []))
            .join(' ');
    }

    private addParaTestFunctional(args: string[]) {
        if (this.isParaTest() && /--filter/.test(args.join(' '))) {
            return args.concat('--functional');
        }
        return args;
    }

    private isParaTest() {
        return (
            /paratest/.test(this.getConfigString('command')) ||
            /paratest/.test(this.getConfigString('phpunit'))
        );
    }

    private hasVariable(variables: { [p: string]: string }, command: string) {
        return new RegExp(this.hasVariablePattern(variables)).test(command);
    }

    private hasVariablePattern(variables: { [p: string]: string }) {
        return Object.keys(variables)
            .map((key) => keyVariable(key))
            .join('|')
            .replace(/[${}]/g, (m) => `\\${m}`);
    }
}
