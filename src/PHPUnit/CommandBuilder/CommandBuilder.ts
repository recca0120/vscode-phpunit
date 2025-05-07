import { SpawnOptions } from 'node:child_process';
import parseArgsStringToArgv from 'string-argv';
import { Configuration, IConfiguration } from '../Configuration';
import { TestResult } from '../ProblemMatcher';
import { Path, PathReplacer } from './PathReplacer';


const isSSH = (commands: string[]) => /^ssh/.test(commands.join(' '));
const isShellCommand = (commands: string[]) => /sh\s+-c/.test(commands.slice(-2).join(' '));

function flatten<T>(arr: (T | T[])[]): T[] {
    return arr.reduce<T[]>((acc, val) =>
            Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val),
        []);
}

export class CommandBuilder {
    private readonly pathReplacer: PathReplacer;
    private quotedArgs = ['--filter', '--configuration'];
    private arguments = '';
    private extra: string[] = [];
    private extraArguments: string[] = [];
    private extraEnvironment: {} = {};

    constructor(private configuration: IConfiguration = new Configuration(), private options: SpawnOptions = {}) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    clone(): CommandBuilder {
        return new CommandBuilder(this.configuration, this.options)
            .setArguments(this.arguments)
            .setExtra(this.extra)
            .setExtraArguments(this.extraArguments)
            .setExtraEnvironment(this.extraEnvironment);
    }

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    setExtra(extra: string[]) {
        this.extra = extra;

        return this;
    }

    setExtraArguments(extraArguments: string[]) {
        this.extraArguments = extraArguments;

        return this;
    }

    setExtraEnvironment(extraEnvironment: { [key: string]: string }) {
        this.extraEnvironment = extraEnvironment;

        return this;
    }

    build() {
        const [command, ...args] = this.createCommand()
            .filter((input: string) => !!input)
            .map((input: string) => this.pathReplacer.replacePathVariables(input).trim());

        const options = { ...this.options, env: this.getEnvironment() };

        return { command, args, options };
    }

    replacePath(result: TestResult) {
        if ('locationHint' in result) {
            result.locationHint = this.pathReplacer.toLocal(result.locationHint!);
        }

        if ('file' in result) {
            result.file = this.pathReplacer.toLocal(result.file!);
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
        const { command, args } = this.build();

        return `${command} ${args.join(' ')}`;
    }

    private createCommand() {
        const commands = this.getCommands();
        const args = this.getArguments();

        if (this.isCommandHasVariable(commands, args)) {
            return this.setParaTestFunctional(commands.reduce((commands: string[], command: string) => {
                for (const name in args) {
                    // command = command.replace(name, variables[name].join(' '));
                    if (name === command) {
                        return commands.concat(...args[name]);
                    }
                }

                return commands.concat(command);
            }, []));
        }

        const executable = this.setParaTestFunctional(flatten(Object.values(args)));
        if (isSSH(commands) || isShellCommand(commands)) {
            return [...commands, this.quoteArgs(executable).join(' ')];
        }

        return [...commands, ...executable];
    }

    private getArguments(): { [pIndex: string]: string[] } {
        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${php}': this.getPhp(),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${phpargs}': this.getPhpArgs(),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${phpunit}': this.getPhpUnit(),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${phpunitargs}': this.getPhpUnitArgs(),
        };
    }

    private getEnvironment() {
        return {
            ...process.env,
            ...this.extraEnvironment,
            ...(this.configuration.get('environment') ?? {}),
        };
    }

    private getCommands() {
        return parseArgsStringToArgv((this.configuration.get('command') as string) ?? '');
    }

    private getPhpUnit() {
        return parseArgsStringToArgv(this.pathReplacer.toRemote(this.configuration.get('phpunit') as string ?? ''));
    }

    private getPhp() {
        return parseArgsStringToArgv(this.pathReplacer.toRemote(this.configuration.get('php') as string ?? ''));
    }

    private getPhpArgs() {
        return this.extra;
    }

    private getPhpUnitArgs(): string[] {
        return this.configuration.getArguments(this.arguments)
            .map((arg: string) => /^--filter/.test(arg) ? arg : this.pathReplacer.toRemote(arg))
            .concat('--colors=never', '--teamcity')
            .concat(...this.extraArguments);
    }

    private setParaTestFunctional(args: string[]) {
        return this.isParaTestFunctional(args) ? [...args, '--functional'] : args;
    }

    private isParaTestFunctional(args: string[]) {
        return (
            !!this.getPhpUnit().join(' ').match(/paratest/) &&
            args.some((arg: string) => !!arg.match(/--filter/))
        );
    }

    private resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }

    private quoteArgs(executable: string[]) {
        return executable.map((input) => new RegExp(`^(${this.quotedArgs.join('|')})`).test(input) ? `'${input}'` : input);
    }

    private isCommandHasVariable(commands: string[], variables: { [p: string]: string[] }) {
        return new RegExp(this.hasVariablePattern(variables)).test(commands.join(' '));
    }

    private hasVariablePattern(variables: { [p: string]: string[] }) {
        return Object.keys(variables)
            .join('|')
            .replace(/[${}]/g, (m) => `\\${m}`);
    }
}