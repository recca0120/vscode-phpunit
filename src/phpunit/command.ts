import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import * as yargsParser from 'yargs-parser';

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

    mapping(path: string) {
        return this.replacePath(path, false);
    }

    run(options?: SpawnOptions): ChildProcess {
        const [command, ...args] = this.apply();

        return spawn(command!, args, options ?? {});
    }

    protected apply() {
        return [this.phpPath(), this.phpUnitPath(), ...this.getArguments()];
    }

    protected replacePath(path: string, localToRemote = false) {
        return localToRemote ? path : this.replaceWindowsPath(this.removePhpVfsComposer(path));
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
            .map((arg: string) => this.replacePath(arg))
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

    protected replacePath(path: string, localToRemote = true) {
        if (this.lookup.size === 0) {
            return super.replacePath(path, localToRemote);
        }

        this.lookup.forEach((remotePath: string, localPath: string) => {
            path = this.replacer(path, localPath, remotePath, localToRemote);
        });

        return super.replacePath(path, localToRemote);
    }

    protected replacer(path: string, localPath: string, remotePath: string, toRemote: boolean) {
        if (toRemote) {
            return path.replace(localPath, remotePath).replace(/\\/g, '/');
        }

        return path.replace(remotePath, localPath);
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
