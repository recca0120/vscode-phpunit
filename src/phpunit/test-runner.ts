import { SpawnOptionsWithoutStdio } from 'child_process';
import { problemMatcher, TestEvent } from './problem-matcher';
import { Command } from './command';

export enum TestRunnerEvent {
    result,
    line,
    close,
}

export class TestRunner {
    private listeners = [...Object.keys(TestRunnerEvent), ...Object.keys(TestEvent)].reduce(
        (listeners, key) => {
            listeners[key] = [];
            return listeners;
        },
        {} as { [p: string | number]: Array<Function> }
    );

    private pattern = new RegExp(
        'PHPUnit\\s[\\d\\.]+\\sby\\sSebastian\\sBergmann\\sand\\scontributors'
    );

    constructor(private options?: SpawnOptionsWithoutStdio) {}

    on(event: TestRunnerEvent | TestEvent, fn: Function) {
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
                    this.processLine(lines.shift()!, command);
                }
                temp = lines.shift()!;
            };

            proc.stdout!.on('data', processOutput);
            proc.stderr!.on('data', processOutput);
            proc.stdout!.on('end', () => this.processLine(temp, command));
            proc.stderr!.on('end', () => this.processLine(temp, command));

            proc.on('close', (code) => {
                this.listeners[TestRunnerEvent.close].forEach((fn) => fn(code));
                this.isPhpUnit(output) ? resolve(output) : reject(output);
            });
        });
    }

    private isPhpUnit(output: string) {
        return this.pattern.test(output);
    }

    private processLine(line: string, command: Command) {
        this.listeners[TestRunnerEvent.line].forEach((fn) => fn(line));
        const result = problemMatcher.parse(line);

        if (result) {
            const mappingResult = command.mapping(result);
            if ('event' in result) {
                this.listeners[result.event].forEach((fn) => fn(mappingResult));
            }

            this.listeners[TestRunnerEvent.result].forEach((fn) => fn(mappingResult));
        }
    }
}
