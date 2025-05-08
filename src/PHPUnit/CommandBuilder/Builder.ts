import { SpawnOptions } from 'node:child_process';
import parseArgsStringToArgv from 'string-argv';
import { Configuration, IConfiguration } from '../Configuration';
import { TestResult } from '../ProblemMatcher';
import { Path, PathReplacer } from './PathReplacer';


const isSSH = (commands: string[]) => /^ssh/.test(commands.join(' '));
const isShellCommand = (commands: string[]) => /sh\s+-c/.test(commands.slice(-2).join(' '));

const flatten = <T>(arr: (T | T[])[]): T[] => arr.reduce<T[]>((acc, val) => {
    return Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val);
}, []);

export class Builder {
    private readonly pathReplacer: PathReplacer;
    private quotedArgs = ['--filter', '--configuration'];
    private arguments = '';
    private extra: string[] = [];
    private extraArguments: string[] = [];
    private extraEnvironment: {} = {};

    constructor(private configuration: IConfiguration = new Configuration(), private options: SpawnOptions = {}) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    clone(): Builder {
        return new Builder(this.configuration, this.options)
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
        const [runtime, ...args] = this.create()
            .filter((input: string) => !!input)
            .map((input: string) => this.pathReplacer.replacePathVariables(input).trim());

        const options = { ...this.options, env: this.getEnvironment() };

        return { runtime, args, options };
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
        const { runtime, args } = this.build();

        return `${runtime} ${args.join(' ')}`;
    }

    private create() {
        const commands = this.getCommand();
        const args = this.getArguments();

        if (this.hasVariable(args, commands)) {
            return this.setParaTestFunctional(commands.reduce((command: string[], arg: string) => {
                for (const name in args) {
                    // command = command.replace(name, variables[name].join(' '));
                    if (name === arg) {
                        return command.concat(...args[name]);
                    }
                }

                return command.concat(arg);
            }, []));
        }

        const options = this.setParaTestFunctional(flatten(Object.values(args)));
        if (isSSH(commands) || isShellCommand(commands)) {
            return [...commands, this.quoteArgv(options).join(' ')];
        }

        return [...commands, ...options];
    }

    private getArguments(): { [pIndex: string]: string[] } {
        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${php}': parseArgsStringToArgv(this.getPhp()),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${phpargs}': this.getPhpArgs(),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            '${phpunit}': parseArgsStringToArgv(this.getPhpUnit()),
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

    private getCommand() {
        return parseArgsStringToArgv((this.configuration.get('command') as string) ?? '');
    }

    private getPhp() {
        return this.pathReplacer.toRemote(this.configuration.get('php') as string ?? '');
    }

    private getPhpArgs() {
        return this.extra;
    }

    private getPhpUnit() {
        return this.pathReplacer.toRemote(this.configuration.get('phpunit') as string ?? '');
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
        const command = args.join(' ');

        return /paratest/.test(command) && /--filter/.test(command);
    }

    private resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }

    private quoteArgv(args: string[]) {
        return args.map((input) => new RegExp(`^(${this.quotedArgs.join('|')})`).test(input) ? `'${input}'` : input);
    }

    private hasVariable(variables: { [p: string]: string[] }, commands: string[]) {
        return new RegExp(this.hasVariablePattern(variables)).test(commands.join(' '));
    }

    private hasVariablePattern(variables: { [p: string]: string[] }) {
        return Object.keys(variables)
            .join('|')
            .replace(/[${}]/g, (m) => `\\${m}`);
    }
}