import type { SpawnOptions } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { IConfiguration, PathReplacer } from '../Configuration';
import { CMD_TEMPLATE, CMD_TEMPLATE_QUOTED } from '../constants';
import type { TestResult } from '../TestOutput';
import { cloneInstance, parseArgv } from '../utils';
import type { Xdebug } from './Xdebug';

const isSSH = (command: string) => /^ssh/.test(command);
const isShellCommand = (command: string) => /sh\s+-c/.test(command);
const keyVariable = (key: string) => `\${${key}}`;

const FILTER_PLACEHOLDER = '__FILTER_PLACEHOLDER__';
const argPlaceholder = (index: number) => `__ARG_PLACEHOLDER_${index}__`;

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

    private create() {
        let command = this.getConfigString('command');
        const isRemoteCommand = isSSH(command) || isShellCommand(command);
        const args = this.getArguments();

        command = this.ensureVariablePlaceholders(command, args, isRemoteCommand);
        command = this.convertSingleToDoubleQuotes(command);
        command = this.removeEmptyPhpArgs(command, args);
        command = this.substituteVariables(command, args.variables);

        const tokens = parseArgv(command);

        return this.replacePlaceholders(tokens, args.placeholders, isRemoteCommand);
    }

    private replacePlaceholders(
        tokens: string[],
        placeholders: Map<string, string>,
        needsQuote: boolean,
    ) {
        if (placeholders.size === 0) {
            return tokens;
        }

        return tokens.map((token) => {
            for (const [placeholder, arg] of placeholders) {
                if (!token.includes(placeholder)) {
                    continue;
                }

                const quoted = this.quoteArgument(arg, needsQuote);
                token = token.replace(placeholder, () => quoted);
            }

            return token;
        });
    }

    private quoteArgument(arg: string, needsQuote: boolean) {
        if (!needsQuote) {
            return arg;
        }

        if (!arg.includes("'")) {
            return `'${arg}'`;
        }

        return `"${arg.replace(/"/g, '\\"')}"`;
    }

    private ensureVariablePlaceholders(
        command: string,
        args: { variables: { [p: string]: string } },
        isRemoteCommand: boolean,
    ) {
        if (this.hasVariable(args.variables, command)) {
            return command;
        }

        return command + (isRemoteCommand ? ` ${CMD_TEMPLATE_QUOTED}` : ` ${CMD_TEMPLATE}`);
    }

    private convertSingleToDoubleQuotes(command: string) {
        return command.replace(/('\${(php|phpargs|phpunit|phpunitargs)}.*?')/g, (_m, ...matched) =>
            matched[0].replace(/^['"]|['"]$/g, '"'),
        );
    }

    private removeEmptyPhpArgs(command: string, args: { variables: { [p: string]: string } }) {
        return args.variables.phpargs ? command : command.replace(/\s+\$\{phpargs\}/, '');
    }

    private substituteVariables(command: string, variableMap: { [p: string]: string }) {
        return Object.entries(variableMap).reduce(
            (cmd, [key, value]) => cmd.replace(keyVariable(key), value.trim()),
            command.trim(),
        );
    }

    private getArguments() {
        const { phpunitargs, placeholders } = this.getPhpUnitArgs();
        return {
            variables: {
                php: this.quoteIfNeeded(this.pathReplacer.toRemote(this.getConfigString('php'))),
                phpargs: this.getPhpArgs(),
                phpunit: this.quoteIfNeeded(
                    this.pathReplacer.toRemote(this.getConfigString('phpunit')),
                ),
                phpunitargs,
            },
            placeholders,
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

    private getPhpUnitArgs(): {
        phpunitargs: string;
        filterArg?: string;
        placeholders: Map<string, string>;
    } {
        let filterArg: string | undefined;
        // Arguments that must survive re-tokenizing the command as a single argument;
        // they are restored (and shell-quoted for remote commands) after parseArgv.
        const placeholders = new Map<string, string>();

        const args = this.configuration
            .getArguments(this.arguments)
            .map((arg: string) => {
                const filterMatch = arg.match(/^--filter=(.*)/);
                if (filterMatch) {
                    filterArg = `--filter=${filterMatch[1]}`;
                    placeholders.set(FILTER_PLACEHOLDER, filterArg);
                    return FILTER_PLACEHOLDER;
                }

                const remoteArg = this.pathReplacer.toRemote(arg);
                if (!/^-.*\s/.test(remoteArg)) {
                    return this.quoteIfNeeded(remoteArg);
                }

                const placeholder = argPlaceholder(placeholders.size);
                placeholders.set(placeholder, remoteArg);
                return placeholder;
            })
            .concat('--colors=always', '--teamcity');

        const allArgs = this.addParaTestFunctional(args, !!filterArg)
            .concat(...(this.xdebug?.getPhpUnitArgs(this.pathReplacer) ?? []))
            .join(' ');

        return { phpunitargs: allArgs, filterArg, placeholders };
    }

    private addParaTestFunctional(args: string[], hasFilter: boolean) {
        if (this.isParaTest() && hasFilter) {
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
