import { spawn, SpawnOptions } from 'child_process';
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
    constructor(private mapping = new Map<string, string>()) {}

    static fromJson(paths?: Path) {
        if (!paths) {
            return new PathReplacer();
        }

        const mapping = new Map<string, string>();
        for (const local in paths) {
            mapping.set(local, paths[local]);
        }

        return new PathReplacer(mapping);
    }

    public remoteToLocal(path: string) {
        return this.toWindowsPath(this.removePhpVfsComposer(this.doRemoteToLocal(path)));
    }

    public localToRemote(path: string) {
        return this.toWindowsPath(this.toPostfixPath(this.doLocalToRemote(path)));
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

    constructor(protected configuration: IConfiguration = new Configuration()) {
        this.pathReplacer = this.resolvePathReplacer(
            this.configuration.get('paths') as { [p: string]: string }
        );
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

    run(options?: SpawnOptions) {
        const [command, ...args] = this.apply()
            .filter((arg: string) => ![undefined, ''].includes(arg))
            .map((arg: string) => this.replaceWorkspaceFolder(arg, options));

        return spawn(command!, args, options ?? {});
    }

    private replaceWorkspaceFolder(arg: string, options?: SpawnOptions) {
        const lookup = ['${PWD}', '${workspaceFolder}'];

        return lookup.reduce((arg, variable) => {
            return arg.replace(this.toReplacePattern(variable), (options?.cwd ?? '') as string);
        }, arg);
    }

    private toReplacePattern(pattern: string) {
        return new RegExp(
            pattern.replace(/[\\$\\{\\}]/g, (matched) => {
                return `\\${matched}` + (['{', '}'].includes(matched) ? '?' : '');
            }),
            'g'
        );
    }

    protected abstract resolvePathReplacer(paths: Path): PathReplacer;

    protected getPathReplacer() {
        return this.pathReplacer;
    }

    protected apply() {
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
            .map((arg: string) => this.getPathReplacer().localToRemote(arg))
            .concat('--teamcity', '--colors=never');
    }

    private phpPath() {
        return this.configuration.get('php', 'php') as string;
    }

    private phpUnitPath() {
        return this.configuration.get('phpunit', 'vendor/bin/phpunit') as string;
    }
}

export class LocalCommand extends Command {
    protected resolvePathReplacer() {
        return new PathReplacer();
    }
}

export abstract class RemoteCommand extends Command {
    protected resolvePathReplacer(paths: { [p: string]: string }) {
        return PathReplacer.fromJson(paths);
    }
}

export class DockerCommand extends RemoteCommand {
    protected apply() {
        return [...this.dockerCommand(), this.container(), ...super.apply()];
    }

    private dockerCommand() {
        return (this.configuration.get('docker.command', 'docker exec') as string).split(' ');
    }

    private container() {
        return this.configuration.get('docker.container', '') as string;
    }
}
