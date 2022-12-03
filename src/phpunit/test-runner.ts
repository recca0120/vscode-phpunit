import { SpawnOptionsWithoutStdio } from 'child_process';
import { problemMatcher, Result, TestEvent } from './problem-matcher';
import { Command } from './command';

export enum TestRunnerEvent {
    result = 'result',
    line = 'line',
    close = 'close',
}

export type TestRunnerObserver = {
    result?: (result: Result) => void;
    line?: (line: string) => void;
    close?: (code: number | null) => void;
} & { [p in TestEvent]?: (result: Result) => void };

export class TestRunner {
    private listeners = [...Object.values(TestRunnerEvent), ...Object.values(TestEvent)].reduce(
        (listeners, key) => {
            listeners[key] = [];
            return listeners;
        },
        {} as { [p: string]: Array<Function> }
    );

    private observer: TestRunnerObserver[] = [];

    private pattern = new RegExp(
        'PHPUnit\\s[\\d\\.]+\\sby\\sSebastian\\sBergmann\\sand\\scontributors'
    );

    constructor(private options?: SpawnOptionsWithoutStdio) {}

    registerObserver(observer: TestRunnerObserver) {
        this.observer.push(observer);
    }

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
                this.trigger(TestRunnerEvent.close, code);
                this.isPhpUnit(output) ? resolve(output) : reject(output);
            });
        });
    }

    private isPhpUnit(output: string) {
        return this.pattern.test(output);
    }

    private processLine(line: string, command: Command) {
        this.trigger(TestRunnerEvent.line, line);
        const result = problemMatcher.parse(line);

        if (result) {
            const mappingResult = command.mapping(result);
            if ('event' in result) {
                this.trigger(result.event, mappingResult);
            }

            this.trigger(TestRunnerEvent.result, mappingResult);
        }
    }

    private trigger(eventName: string, result: Result | string | number | null) {
        this.listeners[eventName].forEach((fn) => fn(result));
    }
}
