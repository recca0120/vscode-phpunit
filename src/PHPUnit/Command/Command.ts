import { SpawnOptions } from 'node:child_process';
import { parseArgsStringToArgv } from 'string-argv';
import { Configuration, IConfiguration } from '../Configuration';
import { Result } from '../ProblemMatcher';
import { parseValue } from '../utils';
import { PathReplacer } from './PathReplacer';


export abstract class Command {
    private arguments = '';
    private readonly pathReplacer: PathReplacer;

    constructor(protected configuration: IConfiguration = new Configuration(), private options: SpawnOptions = {}) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    replacePaths(result: Result) {
        if ('locationHint' in result) {
            result.locationHint = this.getPathReplacer().toLocal(result.locationHint);
        }

        if ('file' in result) {
            result.file = this.getPathReplacer().toLocal(result.file);
        }

        if ('details' in result) {
            result.details = result.details.map(({ file, line }) => ({
                file: this.getPathReplacer().toLocal(file),
                line,
            }));
        }

        return result;
    }


    apply() {
        const [cmd, ...args] = [...this.getPrefix(), ...this.executable()]
            .filter((input: string) => !!input)
            .map((input: string) => this.getPathReplacer().replacePathVariables(input));

        return { cmd, args, options: this.options };
    }

    protected executable() {
        return this.setParaTestFunctional([this.getPhp(), this.getPhpUnit(), ...this.getArguments()]);
    }

    protected abstract resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer;

    protected getPrefix() {
        return parseArgsStringToArgv(this.configuration.get('command') as string ?? '');
    }

    protected getPhpUnit() {
        return (this.configuration.get('phpunit') as string) ?? '';
    }

    protected getPhp() {
        return (this.configuration.get('php') as string) ?? '';
    }

    protected getArguments(): string[] {
        const { _, ...argv } = this.configuration.getArguments(this.arguments);

        return Object.entries(argv)
            .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
            .reduce(
                (argv: any, [key, value]) => [...parseValue(key, value), ...argv],
                _.map((v) => (typeof v === 'number' ? v : decodeURIComponent(v))),
            )
            .map((input: string) => /^--filter/.test(input) ? input : this.getPathReplacer().toRemote(input))
            .concat('--colors=never', '--teamcity');
    }

    protected getPathReplacer() {
        return this.pathReplacer;
    }

    private setParaTestFunctional(args: string[]) {
        return this.isParaTestFunctional(args) ? [...args, '-f'] : args;
    }

    private isParaTestFunctional(args: string[]) {
        return (
            !!this.getPhpUnit().match(/paratest/) &&
            args.some((arg: string) => !!arg.match(/--filter/))
        );
    }
}

