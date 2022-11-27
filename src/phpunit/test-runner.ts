import * as yargsParser from 'yargs-parser';
import { ChildProcess, spawn, SpawnOptions, SpawnOptionsWithoutStdio } from 'child_process';
import { problemMatcher } from './problem-matcher';

const parseValue = (key: any, value: any): string[] => {
    if (value instanceof Array) {
        return value.reduce((acc: string[], item: any) => acc.concat(parseValue(key, item)), []);
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

export class Command {
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

    protected replacePath(path: string, _remote = false) {
        return path;
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

    protected replacePath(path: string, _localToRemote = true) {
        if (this.lookup.size === 0) {
            return path;
        }

        this.lookup.forEach((remotePath: string, localPath: string) => {
            path = this.replacer(path, localPath, remotePath, _localToRemote);
        });

        return path;
    }

    protected replacer(path: string, localPath: string, remotePath: string, toRemote: boolean) {
        if (toRemote) {
            return path.replace(localPath, remotePath).replace(/\\/g, '/');
        }

        return path
            .replace(remotePath, localPath)
            .replace(
                /^(php_qn:\/\/)?(\w:)(.+)/,
                (_matched: string, protocol: string, driveLetter: string, file: string) => {
                    return `${protocol ?? ''}${driveLetter}${file.replace(/\//g, '\\')}`;
                }
            );
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

export enum TestRunnerEvent {
    result,
    line,
    close,
}

export class TestRunner {
    private listeners = Object.keys(TestRunnerEvent).reduce((listeners, key) => {
        listeners[key] = [];
        return listeners;
    }, {} as { [p: string | number]: Array<Function> });

    private pattern = new RegExp(
        'PHPUnit\\s[\\d\\.]+\\sby\\sSebastian\\sBergmann\\sand\\scontributors'
    );

    constructor(private options?: SpawnOptionsWithoutStdio) {}

    on(event: TestRunnerEvent, fn: Function) {
        this.listeners[event].push(fn);

        return this;
    }

    run(command: Command, options?: SpawnOptionsWithoutStdio) {
        return new Promise((resolve, reject) => {
            const proc = command.run({ ...this.options, ...options });

            let temp = '';
            let output = '';
            const processOutput = (data: string) => {
                const out = data.toString();
                output += out;
                temp += out;
                const lines = temp.split(/\r\n|\n/);
                while (lines.length > 1) {
                    this.processLine(command, lines.shift()!);
                }
                temp = lines.shift()!;
            };

            proc.stdout!.on('data', processOutput);
            proc.stderr!.on('data', processOutput);
            proc.stdout!.on('end', () => this.processLine(command, temp));
            proc.stderr!.on('end', () => this.processLine(command, temp));

            proc.on('close', (code) => {
                this.listeners[TestRunnerEvent.close].forEach((fn) => fn(code));
                this.isPhpUnit(output) ? resolve(output) : reject(output);
            });
        });
    }

    private isPhpUnit(output: string) {
        return this.pattern.test(output);
    }

    private processLine(command: Command, line: string) {
        this.listeners[TestRunnerEvent.line].forEach((fn) => fn(line));
        const result = problemMatcher.read(line);

        if (result) {
            if ('locationHint' in result) {
                result.locationHint = command.mapping(result.locationHint);
            }

            if ('file' in result) {
                result.file = command.mapping(result.file);
            }

            this.listeners[TestRunnerEvent.result].forEach((fn) => fn(result));
        }
    }
}
