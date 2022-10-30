import * as yargsParser from 'yargs-parser';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as readline from 'readline';
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

export class Command {
    private listeners: { [p: string]: Array<Function> } = {
        test: [],
        line: [],
        close: [],
    };

    constructor(private options?: SpawnOptionsWithoutStdio) {}

    on(event: 'test' | 'line' | 'close', fn: Function) {
        if (this.listeners[event] === undefined) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(fn);

        return this;
    }

    execute(input: string, options?: SpawnOptionsWithoutStdio) {
        return new Promise((resolve, reject) => {
            const { command, args } = parsePhpUnitCommand(input);

            const process = spawn(command, args, { ...this.options, ...options });
            const rl = readline.createInterface(process.stdout.wrap(process.stderr));

            let lastOutput = '';
            rl.on('line', (line) => {
                lastOutput = line;
                this.listeners['line'].forEach((fn) => fn(line));
                const result = problemMatcher.read(line);
                if (result) {
                    this.listeners['test'].forEach((fn) => fn(result));
                }
            });

            process.on('close', (code) => {
                this.listeners['close'].forEach((fn) => fn(code));
                code === 1 ? reject(lastOutput) : resolve(code);
            });
        });
    }
}
