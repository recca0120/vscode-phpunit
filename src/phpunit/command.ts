import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import * as yargsParser from 'yargs-parser';
import { Result } from './problem-matcher';

const parseValue = (key: any, value: any): string[] => {
    if (value instanceof Array) {
        return value.reduce((acc: string[], item: any) => acc.concat(parseValue(key, item)), []);
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

class PathReplacer {
    constructor(private mapping = new Map<string, string>()) {}

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

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    mapping(result: Result) {
        const pathReplacer = this.resolvePathReplacer();
        if ('locationHint' in result) {
            result.locationHint = pathReplacer.remoteToLocal(result.locationHint);
        }

        if ('file' in result) {
            result.file = pathReplacer.remoteToLocal(result.file);
        }

        if ('details' in result) {
            result.details = result.details.map(({ file, line }) => ({
                file: pathReplacer.remoteToLocal(file),
                line,
            }));
        }

        return result;
    }

    run(options?: SpawnOptions): ChildProcess {
        const [command, ...args] = this.apply();

        return spawn(command!, args, options ?? {});
    }

    protected abstract resolvePathReplacer(): PathReplacer;

    protected apply() {
        return [this.phpPath(), this.phpUnitPath(), ...this.getArguments()];
    }

    private getArguments(): string[] {
        const pathReplacer = this.resolvePathReplacer();
        const { _, ...argv } = yargsParser(this.arguments, { alias: { configuration: ['c'] } });

        return Object.entries(argv)
            .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
            .reduce((args: any, [key, value]) => args.concat(parseValue(key, value)), _)
            .map((arg: string) => pathReplacer.localToRemote(arg))
            .concat('--teamcity', '--colors=never');
    }

    private phpPath() {
        return 'php';
    }

    private phpUnitPath() {
        return 'vendor/bin/phpunit';
    }
}

export class LocalCommand extends Command {
    protected resolvePathReplacer(): PathReplacer {
        return new PathReplacer();
    }
}

export abstract class RemoteCommand extends Command {
    constructor(protected lookup = new Map<string, string>()) {
        super();
    }

    protected resolvePathReplacer(): PathReplacer {
        return new PathReplacer(this.lookup);
    }
}

export class DockerCommand extends RemoteCommand {
    protected apply() {
        return ['docker', 'exec', this.container(), ...super.apply()];
    }

    private container() {
        return 'CONTAINER';
    }
}
