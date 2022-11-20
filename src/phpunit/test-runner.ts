import * as yargsParser from 'yargs-parser';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { problemMatcher } from './problem-matcher';

const parseValue = (key: any, value: any): string[] => {
    if (value instanceof Array) {
        return value.reduce((acc: string[], item: any) => acc.concat(parseValue(key, item)), []);
    }
    const dash = key.length === 1 ? '-' : '--';
    const operator = key.length === 1 ? ' ' : '=';

    return [value === true ? `${dash}${key}` : `${dash}${key}${operator}${value}`];
};

const parsePhpUnitCommand = (input: string) => {
    const { _, ...argv } = yargsParser(input, { alias: { configuration: ['c'] } });

    const [command, ...args] = Object.entries(argv)
        .filter(([key]) => !['teamcity', 'colors', 'testdox', 'c'].includes(key))
        .reduce((args: any, [key, value]) => {
            return args.concat(parseValue(key, value));
        }, _);

    return { command, args: args.concat('--teamcity', '--colors=never') };
};

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

    execute(input: string, options?: SpawnOptionsWithoutStdio) {
        return new Promise((resolve, reject) => {
            const { command, args } = parsePhpUnitCommand(input);
            const proc = spawn(command, args, { ...this.options, ...options });

            let temp = '';
            let output = '';
            const processOutput = (data: string) => {
                const out = data.toString();
                output += out;
                temp += out;
                const lines = temp.split(/\r\n|\n/);
                while (lines.length > 1) {
                    this.processLine(lines.shift()!);
                }
                temp = lines.shift()!;
            };

            proc.stdout.on('data', processOutput);
            proc.stderr.on('data', processOutput);
            proc.stdout.on('end', () => this.processLine(temp));
            proc.stderr.on('end', () => this.processLine(temp));

            proc.on('close', (code) => {
                this.listeners[TestRunnerEvent.close].forEach((fn) => fn(code));
                this.isPhpUnit(output) ? resolve(output) : reject(output);
            });
        });
    }

    private isPhpUnit(output: string) {
        return this.pattern.test(output);
    }

    private processLine(line: string) {
        this.listeners[TestRunnerEvent.line].forEach((fn) => fn(line));
        const result = problemMatcher.read(line);
        if (result) {
            this.listeners[TestRunnerEvent.result].forEach((fn) => fn(result));
        }
    }
}
