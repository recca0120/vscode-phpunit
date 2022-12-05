import { SpawnOptions } from 'child_process';
import * as yargsParser from 'yargs-parser';
import { Result } from './problem-matcher';
import { Configuration, IConfiguration } from './configuration';

const parseValue = (key: any, value: any): string[] => {
    if (value instanceof Array) {
        return value.reduce((acc: string[], item: any) => acc.concat(parseValue(key, item)), []);
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

type Path = { [p: string]: string };

class PathReplacer {
    private workspaceFolderPatterns = ['${PWD}', '${workspaceFolder}'].map((pattern) => {
        return new RegExp(
            pattern.replace(/[\\$\\{\\}]/g, (matched) => {
                return `\\${matched}` + (['{', '}'].includes(matched) ? '?' : '');
            }),
            'g'
        );
    });

    private mapping = new Map<string, string>();

    constructor(private options: SpawnOptions = {}, paths?: Map<string, string> | Path) {
        if (paths instanceof Map) {
            this.mapping = paths;
        } else if (paths) {
            for (const local in paths) {
                this.mapping.set(local, paths[local]);
            }
        }
    }

    public replaceWorkspaceFolder(path: string) {
        const cwd = (this.options?.cwd ?? process.env.cwd) as string;
        return this.workspaceFolderPatterns.reduce(
            (path, pattern) => path.replace(pattern, cwd),
            path
        );
    }

    public remoteToLocal(path: string) {
        return this.toWindowsPath(this.removePhpVfsComposer(this.doRemoteToLocal(path)));
    }

    public localToRemote(path: string) {
        return this.toWindowsPath(
            this.toPostfixPath(this.doLocalToRemote(this.replaceWorkspaceFolder(path)))
        );
    }

    private doRemoteToLocal(path: string) {
        return this.replaceMapping(path, (localPath, remotePath) =>
            path.replace(remotePath, localPath)
        );
    }

    private doLocalToRemote(path: string) {
        return this.replaceMapping(path, (localPath, remotePath) =>
            path.replace(localPath, remotePath)
        );
    }

    private toPostfixPath(path: string) {
        return path.replace(/\\/g, '/');
    }

    private toWindowsPath(path: string) {
        return path.replace(
            /^(php_qn:\/\/)?(\w:)(.+)/,
            (_matched: string, protocol: string, driveLetter: string, file: string) =>
                `${protocol ?? ''}${driveLetter}${file.replace(/\//g, '\\')}`
        );
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//g, '');
    }

    private replaceMapping(path: string, fn: (remotePath: string, localPath: string) => string) {
        if (this.mapping.size === 0) {
            return path;
        }

        this.mapping.forEach(
            (remotePath: string, localPath: string) => (path = fn(localPath, remotePath))
        );

        return path;
    }
}

export abstract class Command {
    private arguments = '';
    private readonly pathReplacer: PathReplacer;

    constructor(
        protected configuration: IConfiguration = new Configuration(),
        private options: SpawnOptions = {}
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
        const [cmd, ...args] = this.doApply()
            .filter((input: string) => !!input)
            .map((input: string) => this.getPathReplacer().replaceWorkspaceFolder(input));

        return { cmd, args, options: this.options };
    }

    protected abstract resolvePathReplacer(
        options: SpawnOptions,
        configuration: IConfiguration
    ): PathReplacer;

    protected getPathReplacer() {
        return this.pathReplacer;
    }

    protected doApply() {
        return [this.phpPath(), this.phpUnitPath(), ...this.getArguments()];
    }

    private getArguments(): string[] {
        const args = [this.arguments, ...(this.configuration.get('args', []) as string[])];

        const { _, ...argv } = yargsParser(args.join(' ').trim(), {
            alias: { configuration: ['c'] },
        });

        return Object.entries(argv)
            .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
            .reduce((args: any, [key, value]) => args.concat(parseValue(key, value)), _)
            .map((input: string) => this.getPathReplacer().localToRemote(input))
            .concat('--teamcity', '--colors=never');
    }

    private phpPath() {
        return (this.configuration.get('php') as string) ?? '';
    }

    private phpUnitPath() {
        return (this.configuration.get('phpunit') as string) ?? '';
    }
}

export class LocalCommand extends Command {
    protected resolvePathReplacer(options: SpawnOptions): PathReplacer {
        return new PathReplacer(options);
    }
}

export class RemoteCommand extends Command {
    protected doApply() {
        return [...this.command(), ...super.doApply()];
    }

    private command() {
        return ((this.configuration.get('command') as string) ?? '').split(' ');
    }

    protected resolvePathReplacer(
        options: SpawnOptions,
        configuration: IConfiguration
    ): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }
}
