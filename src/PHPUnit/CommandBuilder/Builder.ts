import { SpawnOptions } from 'node:child_process';
import parseArgsStringToArgv from 'string-argv';
import { Configuration, IConfiguration } from '../Configuration';
import { TestResult } from '../ProblemMatcher';
import { cloneInstance } from '../utils';
import { Path, PathReplacer } from './PathReplacer';
import { Xdebug } from './Xdebug';


const isSSH = (command: string) => /^ssh/.test(command);
const isShellCommand = (command: string) => /sh\s+-c/.test(command);
const keyVariable = (key: string) => '${' + key + '}';

export class Builder {
    private readonly pathReplacer: PathReplacer;
    private arguments = '';
    private xdebug: Xdebug | undefined;

    constructor(private configuration: IConfiguration = new Configuration(), private options: SpawnOptions = {}) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    clone(): Builder {
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
        const isSshOrShellCommand = isSSH(command) || isShellCommand(command);
        const args = this.getArguments();

        if (!this.hasVariable(args, command)) {
            command += isSshOrShellCommand
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

        return this.decodeFilter(parseArgsStringToArgv(command), isSshOrShellCommand);
    }

    private getArguments() {
        return {
            'php': this.pathReplacer.toRemote(this.getPhp()),
            'phpargs': this.getPhpArgs(),
            'phpunit': this.pathReplacer.toRemote(this.getPhpUnit()),
            'phpunitargs': this.getPhpUnitArgs(),
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
        return (this.configuration.get('command') as string) ?? '';
    }

    private getPhp() {
        return this.configuration.get('php') as string ?? '';
    }

    private getPhpArgs() {
        return this.xdebug?.getPhpArgs().join(' ') ?? '';
    }

    private getPhpUnit() {
        return this.configuration.get('phpunit') as string ?? '';
    }

    private getPhpUnitArgs() {
        const args = this.configuration.getArguments(this.arguments)
            .map((arg: string) => /^--filter/.test(arg) ? arg : this.pathReplacer.toRemote(arg))
            .concat('--colors=never', '--teamcity');

        return this
            .encodeFilter(this.addParaTestFunctional(args))
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
        return (/paratest/.test(this.getCommand()) || /paratest/.test(this.getPhpUnit()));
    }

    private resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }

    private encodeFilter(args: string[]) {
        return args.map((input) => {
            const pattern = new RegExp('^(--filter)=(.*)');

            return input.replace(pattern, (_m, ...matched) => {
                const value = Buffer.from(matched[1], 'utf-8').toString('base64');

                return `${matched[0]}='${value}'`;
            });
        });
    }

    private decodeFilter(args: string[], needsQuote: boolean) {
        return args.map((input) => {
            const pattern = new RegExp('(--filter)=["\'](.+)?["\']');

            return input.replace(pattern, (_m, ...matched) => {
                const value = Buffer.from(matched[1], 'base64').toString('utf-8');
                const quote = value.includes('\'') ? '"' : '\'';
                const filter = `${matched[0]}=${value}`;

                return needsQuote ? `${quote}${filter}${quote}` : filter;
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
