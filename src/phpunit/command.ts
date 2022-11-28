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

export abstract class Command {
    private arguments = '';

    setArguments(args: string) {
        this.arguments = args.trim();

        return this;
    }

    mapping(result: Result) {
        if ('locationHint' in result) {
            result.locationHint = this.remoteToLocal(result.locationHint);
        }

        if ('file' in result) {
            result.file = this.remoteToLocal(result.file);
        }

        if ('details' in result) {
            result.details = result.details.map(({ file, line }) => ({
                file: this.remoteToLocal(file),
                line,
            }));
        }

        return result;
    }

    run(options?: SpawnOptions): ChildProcess {
        const [command, ...args] = this.apply();

        return spawn(command!, args, options ?? {});
    }

    protected apply() {
        return [this.phpPath(), this.phpUnitPath(), ...this.getArguments()];
    }

    protected remoteToLocal(path: string) {
        return this.replaceWindowsPath(this.removePhpVfsComposer(path));
    }

    protected localToRemote(path: string) {
        return this.replaceWindowsPath(path.replace(/\\/g, '/'));
    }

    private removePhpVfsComposer(path: string) {
        return path.replace(/phpvfscomposer:\/\//g, '');
    }

    private replaceWindowsPath(path: string) {
        return path.replace(
            /^(php_qn:\/\/)?(\w:)(.+)/,
            (_matched: string, protocol: string, driveLetter: string, file: string) => {
                return `${protocol ?? ''}${driveLetter}${file.replace(/\//g, '\\')}`;
            }
        );
    }

    private getArguments(): string[] {
        const { _, ...argv } = yargsParser(this.arguments, { alias: { configuration: ['c'] } });

        return Object.entries(argv)
            .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
            .reduce((args: any, [key, value]) => args.concat(parseValue(key, value)), _)
            .map((arg: string) => this.localToRemote(arg))
            .concat('--teamcity', '--colors=never');
    }

    private phpPath() {
        return 'php';
    }

    private phpUnitPath() {
        return 'vendor/bin/phpunit';
    }
}

export abstract class RemoteCommand extends Command {
    constructor(protected lookup = new Map<string, string>()) {
        super();
    }

    protected localToRemote(path: string) {
        return super.localToRemote(
            this.doLoop(path, (localPath, remotePath) => {
                return path.replace(localPath, remotePath);
            })
        );
    }

    protected remoteToLocal(path: string) {
        return super.remoteToLocal(
            this.doLoop(path, (localPath, remotePath) => {
                return path.replace(remotePath, localPath);
            })
        );
    }

    private doLoop(path: string, fn: (remotePath: string, localPath: string) => string) {
        if (this.lookup.size === 0) {
            return path;
        }

        this.lookup.forEach((remotePath: string, localPath: string) => {
            path = fn(localPath, remotePath);
        });

        return path;
    }
}

export class LocalCommand extends Command {}

export class DockerCommand extends RemoteCommand {
    protected apply() {
        return ['docker', 'exec', this.container(), ...super.apply()];
    }

    private container() {
        return 'CONTAINER';
    }
}
