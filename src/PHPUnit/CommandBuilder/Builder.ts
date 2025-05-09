import { SpawnOptions } from 'node:child_process';
import parseArgsStringToArgv from 'string-argv';
import { Configuration, IConfiguration } from '../Configuration';
import { TestResult } from '../ProblemMatcher';
import { Path, PathReplacer } from './PathReplacer';


const isSSH = (command: string) => /^ssh/.test(command);
const isShellCommand = (command: string) => /sh\s+-c/.test(command);

const keyVariable = (key: string) => '${' + key + '}';

const flatten = <T>(arr: (T | T[])[]): T[] => arr.reduce<T[]>((acc, val) => {
    return Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val);
}, []);

export class Builder {
    private readonly pathReplacer: PathReplacer;
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
        let command = this.getCommand();
        const args = this.getArguments();

        if (!this.hasVariable(args, command)) {
            command += isSSH(command) || isShellCommand(command)
                ? ' "${php} ${phpargs} ${phpunit} ${phpunitargs}"'
                : ' ${php} ${phpargs} ${phpunit} ${phpunitargs}';
        }

        command = command.replace(new RegExp('(\'\\$\{(php|phpargs|phpunit|phpunitargs)\}.*?\')', 'g'), (_m, ...matched) => {
            return matched[0].replace(/^['"]|['"]$/g, '"');
        });

        if (!args.phpargs) {
            command = command.replace(/\s+\$\{phpargs\}/, '');
        }

        command = Object.entries(args).reduce((command, [key, value]) => {
            return command.replace(keyVariable(key), value.trim());
        }, command.trim());

        return this.decodeFilter(parseArgsStringToArgv(this.pathReplacer.replacePathVariables(command)));
    }

    private getArguments(): { [pIndex: string]: string } {
        return {
            'php': this.getPhp(),
            'phpargs': this.getPhpArgs(),
            'phpunit': this.getPhpUnit(),
            'phpunitargs': this.getPhpUnitArgs(),
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
        return (this.configuration.get('command') as string) ?? '';
    }

    private getPhp() {
        return this.configuration.get('php') as string ?? '';
    }

    private getPhpArgs() {
        return this.extra.join(' ');
    }

    private getPhpUnit() {
        return this.configuration.get('phpunit') as string ?? '';
    }

    private getPhpUnitArgs(): string {
        return this.encodeFilter(
            this.addParaTestFunctional(this.configuration.getArguments(this.arguments)
                .map((arg: string) => /^--filter/.test(arg) ? arg : this.pathReplacer.toRemote(arg))
                .concat('--colors=never', '--teamcity'),
            ).concat(...this.extraArguments),
        ).join(' ');
    }

    private addParaTestFunctional(args: string[]) {
        if (this.isParaTest() && /--filter/.test(args.join(' '))) {
            return args.concat('--functional');
        }
        return args;
    }

    private isParaTest() {
        return (/paratest/.test(this.getCommand()) || /paratest/.test(this.getPhpUnit()));
    }

    private resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }

    private encodeFilter(args: string[]) {
        return args.map((input) => {
            const pattern = new RegExp('^(--filter)=(.*)');

            return input.replace(pattern, (_m, ...matched) => {
                const value = btoa(matched[1]);

                return `${matched[0]}='${value}'`;
            });
        });
    }

    private decodeFilter(args: string[]) {
        return args.map((input) => {
            const pattern = new RegExp('(--filter)=["\'](.+)?["\']');

            return input.replace(pattern, (_m, ...matched) => {
                const value = atob(matched[1]);
                const quote = value.includes('\'') ? '"' : '\'';

                return `${matched[0]}=${quote}${value}${quote}`;
            });
        });
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