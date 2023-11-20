import { SpawnOptions } from 'child_process';
import * as yargsParser from 'yargs-parser';
import { Result } from './problem-matcher';
import { Configuration, IConfiguration } from './configuration';
import { parseValue } from './utils';

type Path = { [p: string]: string };

class PathReplacer {
    private workspaceFolderPatterns = ['${PWD}', '${workspaceFolder}'].map((pattern) => {
        return new RegExp(
            pattern.replace(/[${}]/g, (matched) => {
                return `\\${matched}` + (['{', '}'].includes(matched) ? '?' : '');
            }),
            'g',
        );
    });

    private mapping = new Map<string, string>();

    constructor(private options: SpawnOptions = {}, paths?: Path) {
        if (paths) {
            for (const local in paths) {
                this.mapping.set(
                    this.replaceWorkspaceFolder(local),
                    this.replaceWorkspaceFolder(paths[local]),
                );
            }
        }
    }

    public replaceWorkspaceFolder(path: string) {
        const cwd = (this.options?.cwd as string) ?? (process.env.cwd as string);

        return this.workspaceFolderPatterns.reduce(
            (path, pattern) => path.replace(pattern, cwd),
            path,
        );
    }

    public remoteToLocal(path: string) {
        return this.toWindowsPath(this.removePhpVfsComposer(this.doRemoteToLocal(path)));
    }

    public localToRemote(path: string) {
        return this.toWindowsPath(
            this.toPostfixPath(this.doLocalToRemote(this.replaceWorkspaceFolder(path))),
        );
    }

    private doRemoteToLocal(path: string) {
        return this.replaceMapping(path, (localPath, remotePath) => {
            return path.replace(
                new RegExp(`${remotePath === '.' ? `\\${remotePath}` : remotePath}(\/)`, 'g'),
                (_m, sep) => `${localPath}${sep}`,
            );
        });
    }

    private doLocalToRemote(path: string) {
        return this.replaceMapping(path, (localPath, remotePath) =>
            path.replace(localPath, remotePath),
        );
    }

    private toPostfixPath(path: string) {
        return path.replace(/\\/g, '/');
    }

    private toWindowsPath(path: string) {
        return path
            .replace(/php_qn:\/\//g, 'php_qn:||')
            .replace(/\w:[\\\/][^:]+/g, (matched) => matched.replace(/\//g, '\\'))
            .replace(/php_qn:\|\|/g, 'php_qn://');
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//g, '');
    }

    private replaceMapping(path: string, fn: (remotePath: string, localPath: string) => string) {
        if (this.mapping.size === 0) {
            return path;
        }

        this.mapping.forEach(
            (remotePath: string, localPath: string) => (path = fn(localPath, remotePath)),
        );

        return path;
    }
}

export abstract class Command {
    private arguments = '';
    private readonly pathReplacer: PathReplacer;

    constructor(
        protected configuration: IConfiguration = new Configuration(),
        private options: SpawnOptions = {},
    ) {
        this.pathReplacer = this.resolvePathReplacer(options, configuration);
    }

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    mapping(result: Result) {
        if ('locationHint' in result) {
            result.locationHint = this.getPathReplacer().remoteToLocal(result.locationHint);
        }

        if ('file' in result) {
            result.file = this.getPathReplacer().remoteToLocal(result.file);
        }

        if ('details' in result) {
            result.details = result.details.map(({ file, line }) => ({
                file: this.getPathReplacer().remoteToLocal(file),
                line,
            }));
        }

        return result;
    }

    apply() {
        const [cmd, ...args] = this.getCommand()
            .filter((input: string) => !!input)
            .map((input: string) => this.getPathReplacer().replaceWorkspaceFolder(input));

        return { cmd, args, options: this.options };
    }

    protected getCommand() {
        return [...this.getCommendPrefix(), ...this.getPHPUnitWithArgs()];
    }

    protected getPHPUnitWithArgs() {
        return this.setParaTestFunctional([
            this.phpPath(),
            this.phpUnitPath(),
            ...this.getArguments(),
        ]);
    }

    protected abstract resolvePathReplacer(
        options: SpawnOptions,
        configuration: IConfiguration,
    ): PathReplacer;

    private phpUnitPath() {
        return (this.configuration.get('phpunit') as string) ?? '';
    }

    private getCommendPrefix() {
        return ((this.configuration.get('command') as string) ?? '').split(' ');
    }

    private phpPath() {
        return (this.configuration.get('php') as string) ?? '';
    }

    private getArguments(): string[] {
        const args = [this.arguments, ...(this.configuration.get('args', []) as string[])];

        const { _, ...argv } = yargsParser(args.join(' ').trim(), {
            alias: { configuration: ['c'] },
            configuration: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'camel-case-expansion': false,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'boolean-negation': false,
            },
        });

        return Object.entries(argv)
            .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
            .reduce((args: any, [key, value]) => [...parseValue(key, value), ...args], _)
            .map((input: string) => this.getPathReplacer().localToRemote(input))
            .concat('--colors=never', '--teamcity');
    }

    private getPathReplacer() {
        return this.pathReplacer;
    }

    private setParaTestFunctional(args: string[]) {
        return this.isParaTestFunctional(args) ? [...args, '-f'] : args;
    }

    private isParaTestFunctional(args: string[]) {
        return (
            !!this.phpUnitPath().match(/paratest/) &&
            args.some((arg: string) => !!arg.match(/--filter/))
        );
    }
}

export class LocalCommand extends Command {
    protected resolvePathReplacer(options: SpawnOptions): PathReplacer {
        return new PathReplacer(options);
    }
}

export class RemoteCommand extends Command {
    protected resolvePathReplacer(
        options: SpawnOptions,
        configuration: IConfiguration,
    ): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }

    protected getPHPUnitWithArgs() {
        return [
            super
                .getPHPUnitWithArgs()
                .map((input) => (/^-/.test(input) ? `'${input}'` : input))
                .join(' '),
        ];
    }
}
