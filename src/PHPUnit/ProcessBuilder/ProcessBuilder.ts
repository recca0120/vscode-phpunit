import type { SpawnOptions } from 'node:child_process';
import parseArgsStringToArgv from 'string-argv';
import { Configuration, type IConfiguration } from '../Configuration';
import type { TestResult } from '../ProblemMatcher';
import { cloneInstance } from '../utils';
import { base64DecodeFilter, base64EncodeFilter } from './FilterEncoder';
import { type Path, PathReplacer } from './PathReplacer';
import { CMD_TEMPLATE, CMD_TEMPLATE_QUOTED } from './placeholders';
import type { Xdebug } from './Xdebug';

const isSSH = (command: string) => /^ssh/.test(command);
const isShellCommand = (command: string) => /sh\s+-c/.test(command);
const keyVariable = (key: string) => `\${${key}}`;

export class ProcessBuilder {
    private readonly pathReplacer: PathReplacer;
    private arguments = '';
    private xdebug: Xdebug | undefined;

    constructor(
        private configuration: IConfiguration = new Configuration(),
        private options: SpawnOptions = {},
    ) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    clone(): ProcessBuilder {
        return cloneInstance(this);
    }

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    setXdebug(xdebug?: Xdebug) {
        this.xdebug = xdebug;

        return this;
    }

    getXdebug() {
        return this.xdebug;
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
        let command = this.getCommand();
        const isRemoteCommand = isSSH(command) || isShellCommand(command);
        const args = this.getArguments();

        command = this.ensureVariablePlaceholders(command, args, isRemoteCommand);
        command = this.convertSingleToDoubleQuotes(command);
        command = this.removeEmptyPhpArgs(command, args);
        command = this.substituteVariables(command, args);

        return base64DecodeFilter(parseArgsStringToArgv(command), isRemoteCommand);
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
            php: this.quoteIfNeeded(this.pathReplacer.toRemote(this.getPhp())),
            phpargs: this.getPhpArgs(),
            phpunit: this.quoteIfNeeded(this.pathReplacer.toRemote(this.getPhpUnit())),
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

    private getCommand() {
        return this.getConfigString('command');
    }

    private getPhp() {
        return this.getConfigString('php');
    }

    private getPhpArgs() {
        return this.xdebug?.getPhpArgs().join(' ') ?? '';
    }

    private getPhpUnit() {
        return this.getConfigString('phpunit');
    }

    private getConfigString(key: string) {
        return (this.configuration.get(key) as string) ?? '';
    }

    private quoteIfNeeded(value: string) {
        if (value?.includes(' ') && !/^["']/.test(value) && /[/\\]/.test(value)) {
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
            .concat(...(this.xdebug?.getPhpUnitArgs() ?? []))
            .join(' ');
    }

    private addParaTestFunctional(args: string[]) {
        if (this.isParaTest() && /--filter/.test(args.join(' '))) {
            return args.concat('--functional');
        }
        return args;
    }

    private isParaTest() {
        return /paratest/.test(this.getCommand()) || /paratest/.test(this.getPhpUnit());
    }

    private resolvePathReplacer(
        options: SpawnOptions,
        configuration: IConfiguration,
    ): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
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
